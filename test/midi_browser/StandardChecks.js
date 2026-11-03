import {
  load_instrument_catalog,
  instrument_audio_url,
} from "../../src/pages/games/music/MidiInstrumentCatalog.js";
import { create_instrument_registry } from "../../src/pages/games/music/MidiInstruments.js";
import MidiSampleCache from "../../src/pages/games/music/MidiSampleCache.js";
import {
  sample_window,
  verify_asset_bytes,
} from "../../src/pages/games/music/MidiSampleAsset.js";
import { contexts, rms, wav } from "./Capture.js";
import { resource_counts } from "./ResourceChecks.js";
const check = (value, message) => {
  if (!value) throw new Error(message);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const route = "track:0:channel:9",
  selection = "test-standard-prepared";

// Test-only metadata adapter. Production percussion routing and short note-off
// semantics are deliberately not enabled/certified by these asset probes.
export function standard_adapter(kit, revision) {
  const entries = kit.playback_assets.flatMap((asset) =>
    asset.hits.map((hit) => ({ asset, hit })),
  );
  const find = (note) =>
    entries.find(
      ({ hit }) =>
        hit.midi_note === note.pitch &&
        hit.velocity_min <= note.velocity &&
        note.velocity <= hit.velocity_max,
    );
  return create_instrument_registry(
    [
      {
        id: selection,
        library_id: "test-percussion",
        version: revision,
        verified: true,
        programs: [0],
        percussion: true,
        min_pitch: 0,
        max_pitch: 127,
        supports_note: (note) => !!find(note),
        sample: (note) => {
          const { asset, hit } = find(note);
          return {
            url: instrument_audio_url(
              asset.url,
              `${location.origin}/api/asset/instruments`,
            ),
            credentials: "include",
            sha256: asset.sha256,
            encoded_bytes: asset.bytes,
            asset_frames: asset.frames,
            asset_sample_rate: asset.sample_rate,
            asset_channels: 1,
            offset_seconds: hit.offset_seconds,
            duration_seconds: hit.duration_seconds,
            gain: note.velocity / hit.render_velocity,
            pan: 0,
            release_seconds: 0,
          };
        },
      },
    ],
    { default_library_id: "test-percussion" },
  );
}
const note = (pitch, velocity = 127) => ({
  track: 0,
  channel: 9,
  pitch,
  velocity,
  program: 0,
  start_seconds: 0,
  end_seconds: 30,
});
function energy(buffer, start, end) {
  let peak = 0,
    sum = 0,
    count = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (
      let i = Math.max(0, Math.ceil(start * buffer.sampleRate));
      i < Math.min(data.length, Math.floor(end * buffer.sampleRate));
      i++
    ) {
      const v = data[i];
      check(Number.isFinite(v), "Nonfinite drum PCM");
      sum += v * v;
      peak = Math.max(peak, Math.abs(v));
      count++;
    }
  }
  return { rms: Math.sqrt(sum / Math.max(1, count)), peak, samples: count };
}
async function all_hits(kit, registry, progress, checkpoint, report) {
  for (const [index, asset] of kit.playback_assets.entries()) {
    progress(
      `Standard chunk ${index + 1}/${kit.playback_assets.length}: native 48 / 44.1 kHz`,
    );
    const response = await fetch(
      instrument_audio_url(
        asset.url,
        `${location.origin}/api/asset/instruments`,
      ),
      { credentials: "include" },
    );
    check(response.ok, "Drum chunk fetch failed");
    const bytes = await response.arrayBuffer();
    await verify_asset_bytes(
      { sha256: asset.sha256, encoded_bytes: asset.bytes },
      bytes,
    );
    report.network_fetches++;
    report.assets[asset.id] = asset.sha256;
    for (const rate of [48000, 44100]) {
      const duration =
        asset.hits.reduce((s, h) => s + h.duration_seconds + 0.15, 0) + 0.2;
      const context = new OfflineAudioContext(
          2,
          Math.ceil(duration * rate),
          rate,
        ),
        cache = new MidiSampleCache({
          concurrency: 1,
          fetch_sample: async () => new Response(bytes.slice(0)),
        });
      const sources = [];
      try {
        const notes = asset.hits.map((hit) =>
          note(hit.midi_note, hit.render_velocity),
        );
        const samples = await cache.prepare(
          notes,
          context,
          new AbortController().signal,
          { registry, assignments: { [route]: selection } },
        );
        check(cache.buffers.size === 1, "One chunk was decoded more than once");
        report.native_decodes++;
        check(
          cache.bytes <= 48 * 1024 * 1024,
          "Native decoded drum chunk exceeds budget",
        );
        report.largest_native_decoded_bytes = Math.max(
          report.largest_native_decoded_bytes,
          cache.bytes,
        );
        const buffer = samples[0].buffer;
        check(
          buffer.numberOfChannels === 1 && buffer.sampleRate === rate,
          "Native drum format mismatch",
        );
        check(
          Math.abs(buffer.duration - asset.frames / 48000) <= 2 / rate,
          "Native resampling changed source bounds",
        );
        let cursor = 0.05;
        const scheduled = [];
        for (const sample of samples) {
          const window = sample_window(sample);
          const source = context.createBufferSource();
          source.buffer = sample.buffer;
          source.connect(context.destination);
          source.start(cursor, window.offset, window.duration);
          source.stop(cursor + window.duration);
          sources.push(source);
          scheduled.push({ start: cursor, end: cursor + window.duration });
          cursor += window.duration + 0.15;
        }
        const output = await context.startRendering();
        for (const [i, hit] of asset.hits.entries()) {
          const slot = scheduled[i],
            active = energy(output, slot.start, slot.end),
            after = energy(output, slot.end + 0.025, slot.end + 0.12);
          check(
            active.rms > 0 && active.peak > 0 && active.peak <= 1,
            "Silent or clipped native hit",
          );
          check(
            after.samples > 0 && after.peak < 1e-7,
            "Native hit crossed its finite window",
          );
          report.hits.push({
            asset_id: asset.id,
            midi_note: hit.midi_note,
            velocity_min: hit.velocity_min,
            velocity_max: hit.velocity_max,
            render_velocity: hit.render_velocity,
            native_sample_rate: rate,
            active,
            after_window: after,
          });
        }
        check(context.state === "closed", "Offline context did not close");
      } finally {
        for (const source of sources) {
          source.onended = null;
          source.disconnect();
        }
        cache.clear();
      }
    }
    report.chunks_checked++;
    await checkpoint(report);
  }
}
async function realtime(kit, registry, until) {
  const context = new AudioContext({ sampleRate: 48000 }),
    master = context.createGain();
  master.gain.value = 0.5;
  master.connect(context.destination);
  const cache = new MidiSampleCache();
  let fetches = 0;
  cache.fetch_sample = (...args) => {
    fetches++;
    return fetch(...args);
  };
  const voices = new Set();
  let scheduled_count = 0;
  const stop = () => {
    for (const voice of [...voices]) voice.stop();
  };
  function launch(sample, when) {
    const source = context.createBufferSource(),
      gain = context.createGain(),
      window = sample_window(sample);
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      source.onended = null;
      source.disconnect();
      gain.disconnect();
      voices.delete(voice);
    };
    const voice = {
      stop: () => {
        if (cleaned) return;
        source.onended = null;
        try {
          source.stop();
        } finally {
          cleanup();
        }
      },
    };
    source.buffer = sample.buffer;
    gain.gain.value = sample.gain;
    source.connect(gain);
    gain.connect(master);
    source.onended = cleanup;
    voices.add(voice);
    source.start(when, window.offset, window.duration);
    source.stop(when + window.duration);
    scheduled_count++;
    return voice;
  }
  try {
    await context.resume();
    await context.capture_ready;
    const notes = [note(35), note(38), note(42), note(49)],
      settings = { registry, assignments: { [route]: selection } };
    const samples = await cache.prepare(
      notes,
      context,
      new AbortController().signal,
      settings,
    );
    const start = context.currentTime + 0.05;
    for (const sample of samples) launch(sample, start);
    check(voices.size === 4, "Four simultaneous drum voices unavailable");
    await until(
      () => context.currentTime > start + 0.3,
      "real-time drum audio clock",
    );
    await until(
      () => rms(context, start + 0.03, start + 0.2).samples > 0,
      "drum capture",
    );
    const active = rms(context, start + 0.03, start + 0.2);
    check(active.rms > 1e-5, "Real-time drum output silent");
    const stopped = context.currentTime;
    stop();
    await sleep(250);
    const silence = rms(context, stopped + 0.04, stopped + 0.2);
    check(silence.samples > 0 && silence.peak < 1e-7, "Drum Stop left output");
    const first_fetches = fetches;
    await cache.prepare(notes, context, new AbortController().signal, settings);
    const replay = context.currentTime + 0.03;
    for (const sample of samples) launch(sample, replay);
    await until(() => context.currentTime > replay + 0.2, "drum replay clock");
    check(
      fetches === first_fetches && scheduled_count === 8,
      "Replay refetched or lost drum voices",
    );
    stop();
    const kick = (
      await cache.prepare(
        [note(35)],
        context,
        new AbortController().signal,
        settings,
      )
    )[0];
    const completion = context.currentTime + 0.03;
    launch(kick, completion);
    await until(() => voices.size === 0, "natural drum completion");
    await until(
      () => context.currentTime > completion + kick.duration_seconds + 0.2,
      "post-hit clock",
    );
    const after = rms(
      context,
      completion + kick.duration_seconds + 0.04,
      completion + kick.duration_seconds + 0.16,
    );
    check(
      after.samples > 0 && after.peak < 1e-7,
      "Natural drum completion bled into another hit",
    );
    await fetch("/standard_audio", { method: "POST", body: wav(context) });
    return {
      active,
      after_stop: silence,
      after_completion: after,
      simultaneous_voices: 4,
      replay_without_fetch: true,
      natural_completion: true,
      first_fetches,
      scheduled_voices: scheduled_count,
      native_sample_rate: context.sampleRate,
      scope:
        "Test-only bounded-hit asset playback. Production kit routing, MIDI short note-off policy and runtime choking remain step 5.",
    };
  } finally {
    stop();
    cache.clear();
    master.disconnect();
    await context.close();
  }
}
export async function verify_standard(until, progress, checkpoint) {
  const loaded = await load_instrument_catalog(
      `${location.origin}/api/asset/instruments`,
    ),
    kit = loaded.catalog.drum_kits.find(
      (k) => k.id === "fluidr3-percussion-kit-standard",
    );
  check(
    kit && kit.assets_available,
    "Prepared disabled Standard kit unavailable",
  );
  const registry = standard_adapter(kit, loaded.catalog.revision),
    entries = kit.playback_assets.flatMap((a) => a.hits);
  let velocities = 0;
  for (const declared of kit.notes)
    for (let v = 1; v <= 127; v++) {
      const expected = declared.velocity_ranges.some(
        ([lo, hi]) => lo <= v && v <= hi,
      );
      const matches = entries.filter(
        (h) =>
          h.midi_note === declared.midi_note &&
          h.velocity_min <= v &&
          v <= h.velocity_max,
      );
      check(
        matches.length === (expected ? 1 : 0),
        "Missing or ambiguous Standard velocity",
      );
      check(
        registry.can_assign([note(declared.midi_note, v)], selection) ===
          expected,
        "Test adapter disagrees with note coverage",
      );
      velocities++;
    }
  check(
    !registry.can_assign([note(26)], selection) &&
      !registry.can_assign([note(88)], selection),
    "Unsupported drum identities were synthesized",
  );
  check(
    loaded.registry.can_assign([note(42)], "original") === kit.enabled,
    "Production percussion disagrees with kit activation",
  );
  const report = {
    pass: false,
    in_progress: true,
    catalog_revision: loaded.catalog.revision,
    kit_id: kit.id,
    render_config_sha256: kit.rendering.config_sha256,
    sample_rates: [48000, 44100],
    note_identities: kit.notes.length,
    velocity_lookups: velocities,
    network_fetches: 0,
    native_decodes: 0,
    chunks_checked: 0,
    largest_native_decoded_bytes: 0,
    assets: {},
    hits: [],
  };
  await all_hits(kit, registry, progress, checkpoint, report);
  progress("Standard real-time polyphony, Stop, replay and completion");
  report.realtime = await realtime(kit, registry, until);
  await sleep(50);
  report.cleanup = resource_counts(contexts);
  check(
    Object.values(report.cleanup).every((value) => value === 0),
    "Drum verification leaked resources",
  );
  report.pass = true;
  report.in_progress = false;
  report.hit_windows = entries.length;
  report.scope =
    "All prepared hit windows rendered natively at both rates; test-only real-time asset adapter. No production drum routing or human quality certification.";
  return report;
}
