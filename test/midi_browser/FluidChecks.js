import { load_instrument_catalog } from "../../src/pages/games/music/MidiInstrumentCatalog.js";
import MidiSampleCache from "../../src/pages/games/music/MidiSampleCache.js";
import { schedule_midi_voice } from "../../src/pages/games/music/MidiVoice.js";
import { verify_asset_engine } from "./AssetEngineChecks.js";
import { wav } from "./Capture.js";
const check = (value, message) => {
  if (!value) throw new Error(message);
};
const rate = 48000;
const pairs = [
  ["Piano", "grandb", "acoustic-grand-piano"],
  ["Flute", "flute", "flute"],
  ["Violin", "violin-10-loud", "violin"],
  ["Bass", "acoustic-bass", "acoustic-bass"],
  ["Guitar", "distortion-guitar", "distortion-guitar"],
  ["Organ", "pipe-organ", "church-organ"],
  ["Vibraphone", "vibraphone", "vibraphone"],
];
function energy(buffer, start, end) {
  let sum = 0,
    peak = 0,
    count = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (
      let frame = Math.round(start * rate);
      frame < Math.min(data.length, Math.round(end * rate));
      frame++
    ) {
      const value = data[frame];
      check(Number.isFinite(value), "Nonfinite rendered PCM");
      sum += value * value;
      peak = Math.max(peak, Math.abs(value));
      count++;
    }
  }
  return { rms: Math.sqrt(sum / Math.max(1, count)), peak, samples: count };
}
const note = (pitch, start = 0, end = 0.7, velocity = 100, program = 0) => ({
  track: 0,
  channel: 0,
  pitch,
  velocity,
  program,
  start_seconds: start,
  end_seconds: end,
});
async function render(registry, id, notes, duration) {
  const context = new OfflineAudioContext(2, Math.round(duration * rate), rate);
  let fetches = 0;
  const cache = new MidiSampleCache({
      concurrency: 1,
      fetch_sample: (...args) => {
        fetches++;
        return fetch(...args);
      },
    }),
    voices = [];
  try {
    const samples = await cache.prepare(
      notes,
      context,
      new AbortController().signal,
      { registry, assignments: { "track:0:channel:0": `asset-${id}` } },
    );
    for (let i = 0; i < notes.length; i++)
      voices.push(
        schedule_midi_voice(
          context,
          context.destination,
          notes[i],
          samples[i],
          0,
          () => {},
        ),
      );
    const buffer = await context.startRendering();
    return {
      buffer,
      fetches,
      decoded_bytes: cache.bytes,
      native_rate: samples[0].buffer.sampleRate,
      sample_duration: samples[0].duration_seconds,
    };
  } finally {
    for (const voice of voices) voice?.stop();
    cache.clear();
  }
}
export async function fluid_representatives(until, progress) {
  const loaded = await load_instrument_catalog(
    `${location.origin}/api/asset/instruments`,
    { allow_prepared: true },
  );
  const clips = [],
    comparisons = [],
    lifecycle = [];
  let cursor = 0;
  for (const [name, legacy, fluid] of pairs) {
    const comparison = { name };
    for (const [library, id] of [
      ["legacy", legacy],
      ["fluidr3-gm", `fluidr3-gm-${fluid}`],
    ]) {
      progress(`Compare ${name}: ${library}`);
      const result = await render(loaded.registry, id, [note(60, 0, 5)], 5.4);
      comparison[library] = {
        initial: energy(result.buffer, 0.1, 0.8),
        late: energy(result.buffer, 4, 4.8),
        duration: result.sample_duration,
        decoded_bytes: result.decoded_bytes,
      };
      check(
        comparison[library].initial.rms > 1e-8,
        `Representative was silent: ${id}`,
      );
      clips.push({ buffer: result.buffer, start: cursor, name, library });
      cursor += 5.4;
    }
    comparisons.push(comparison);
    progress(`Realtime ${name}: FluidR3 polyphony, replay, Stop and boundary`);
    const { report } = await verify_asset_engine(until, {
      instrument_id: `fluidr3-gm-${fluid}`,
      allow_prepared: true,
    });
    lifecycle.push(report);
  }
  const left = new Float32Array(Math.round(cursor * rate)),
    right = new Float32Array(left.length);
  for (const clip of clips) {
    const offset = Math.round(clip.start * rate);
    left.set(clip.buffer.getChannelData(0), offset);
    right.set(clip.buffer.getChannelData(1), offset);
  }
  await fetch("/fluid_audition", {
    method: "POST",
    body: wav({ sampleRate: rate, captured: [{ left, right, time: 0 }] }),
  });
  return {
    pass: true,
    source_catalog_revision: loaded.catalog.revision,
    native_sample_rate: rate,
    test_only_prepared_source_opt_in: true,
    comparisons,
    lifecycle,
    audition_segments: clips.map(({ start, name, library }) => ({
      start_seconds: start,
      duration_seconds: 5.4,
      name,
      library,
    })),
    verification:
      "Native offline A/B rendering plus real AudioContext output capture for each FluidR3 representative; subjective quality review remains a listening decision.",
  };
}
export async function fluid_complete(progress, checkpoint) {
  const loaded = await load_instrument_catalog(
    `${location.origin}/api/asset/instruments`,
    { allow_prepared: true },
  );
  const instruments = loaded.catalog.instruments.filter(
    (item) => item.library_id === "fluidr3-gm",
  );
  check(
    instruments.length === 128,
    "Expected the complete 128-program FluidR3 library",
  );
  const results = [],
    assets = {};
  let notes_checked = 0,
    chunks_checked = 0,
    excluded_checked = 0,
    largest_decoded_bytes = 0;
  for (const item of instruments) {
    const provider = loaded.registry.providers[`asset-${item.id}`];
    check(provider, "Missing prepared provider");
    const available = new Set(item.available_pitches);
    for (let pitch = 21; pitch <= 108; pitch++)
      if (!available.has(pitch)) {
        check(
          !loaded.registry.can_assign([note(pitch)], provider.id),
          `Silent source remained playable: ${item.id}/${pitch}`,
        );
        excluded_checked++;
      }
    const observations = [];
    for (const asset of item.playback_assets) {
      progress(
        `${results.length + 1}/128 ${item.name}: ${asset.notes[0].midi_pitch}–${asset.notes.at(-1).midi_pitch}`,
      );
      const notes = asset.notes.map((entry, i) =>
        note(entry.midi_pitch, i, i + 0.7, 100, item.midi_programs[0]),
      );
      const rendered = await render(
        loaded.registry,
        item.id,
        notes,
        notes.length,
      );
      check(
        rendered.fetches === 1,
        "A shared octave chunk fetched more than once",
      );
      check(rendered.native_rate === rate, "Native resample rate differs");
      largest_decoded_bytes = Math.max(
        largest_decoded_bytes,
        rendered.decoded_bytes,
      );
      check(
        rendered.decoded_bytes <= 48 * 1024 * 1024,
        "Decoded chunk exceeds budget",
      );
      for (let i = 0; i < notes.length; i++) {
        const active = energy(rendered.buffer, i + 0.05, i + 0.7),
          silent = energy(rendered.buffer, i + 0.92, i + 1);
        check(
          active.rms > 1e-8,
          `Silent native output: ${item.id}/${notes[i].pitch}`,
        );
        check(
          active.peak < 1,
          `Clipped native output: ${item.id}/${notes[i].pitch}`,
        );
        check(
          silent.peak < 1e-7,
          `Voice leaked after release: ${item.id}/${notes[i].pitch}`,
        );
        check(
          loaded.registry.resolve(notes[i], "original", {
            library_id: "fluidr3-gm",
          }).instrument_id === provider.id,
          "Program resolved to wrong library",
        );
        observations.push({
          pitch: notes[i].pitch,
          rms: active.rms,
          peak: active.peak,
        });
        notes_checked++;
      }
      assets[asset.id] = asset.sha256;
      chunks_checked++;
    }
    results.push({ id: item.id, notes: observations });
    await checkpoint({
      pass: null,
      state: "running",
      source_catalog_revision: loaded.catalog.revision,
      completed_instruments: results.length,
      notes_checked,
      chunks_checked,
      excluded_checked,
      results,
    });
  }
  check(
    notes_checked === 10648 &&
      chunks_checked === 1099 &&
      excluded_checked === 616,
    "Full library totals differ from import",
  );
  return {
    pass: true,
    source_catalog_revision: loaded.catalog.revision,
    source_revision: loaded.catalog.libraries.find(
      (item) => item.id === "fluidr3-gm",
    ).source_revision,
    native_sample_rate: rate,
    test_only_prepared_source_opt_in: true,
    instruments: results.length,
    notes_checked,
    chunks_checked,
    excluded_checked,
    largest_decoded_bytes,
    assets,
    results,
    verification:
      "Chromium native 48kHz resampling/rendering of every usable note, every chunk, release silence, scoped programs and excluded-key rejection. Does not certify subjective quality or other browsers.",
  };
}
