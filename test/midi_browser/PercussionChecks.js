import MidiPlaybackController from "../../src/pages/games/music/MidiPlaybackController.js";
import MidiScheduler from "../../src/pages/games/music/MidiScheduler.js";
import MidiSampleCache from "../../src/pages/games/music/MidiSampleCache.js";
import { load_instrument_catalog } from "../../src/pages/games/music/MidiInstrumentCatalog.js";
import { contexts, rms, wav } from "./Capture.js";
import { resource_counts } from "./ResourceChecks.js";
const check = (value, message) => {
  if (!value) throw new Error(message);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const file = (track) =>
  new Uint8Array([
    77,
    84,
    104,
    100,
    0,
    0,
    0,
    6,
    0,
    0,
    0,
    1,
    1,
    224,
    77,
    84,
    114,
    107,
    0,
    0,
    0,
    track.length,
    ...track,
  ]);
// One-tick note-offs and pedal-down deliberately cannot truncate drum tails.
const beat = file([
  0, 0xb9, 64, 127, 0, 0x99, 35, 110, 0, 0x99, 38, 100, 0, 0x99, 46, 127, 1,
  0x89, 35, 0, 0, 0x89, 38, 0, 0, 0x89, 46, 0, 95, 0x99, 42, 127, 1, 0x89, 42,
  0, 0, 255, 47, 0,
]);
const open_hat = file([0, 0x99, 46, 127, 1, 0x89, 46, 0, 0, 255, 47, 0]);
const energy = (buffer, start, end) => {
  const data = buffer.getChannelData(0);
  let sum = 0;
  const lo = Math.ceil(start * buffer.sampleRate),
    hi = Math.floor(end * buffer.sampleRate);
  for (let i = lo; i < hi; i++) sum += data[i] * data[i];
  return Math.sqrt(sum / (hi - lo));
};
async function choke_reference(registry, closed) {
  const context = new OfflineAudioContext(1, 48000 * 2, 48000),
    cache = new MidiSampleCache();
  const notes = [
    {
      channel: 9,
      track: 0,
      pitch: 46,
      velocity: 127,
      program: 0,
      start_seconds: 0,
      end_seconds: 0.001,
    },
  ];
  if (closed)
    notes.push({
      ...notes[0],
      track: 1,
      pitch: 42,
      start_seconds: 0.08,
      end_seconds: 0.081,
    });
  const assignments = {
    "track:0:channel:9": "original",
    "track:1:channel:9": "original",
  };
  const samples = await cache.prepare(
    notes,
    context,
    new AbortController().signal,
    { registry, assignments },
  );
  const scheduler = new MidiScheduler({
    context,
    destination: context.destination,
    song: { notes, duration_seconds: 0.102 },
    samples,
    set_interval: () => 1,
    clear_interval: () => {},
  });
  try {
    scheduler.start();
    const output = await context.startRendering();
    return energy(output, 1.3, 1.8);
  } finally {
    scheduler.stop();
    cache.clear();
  }
}
export async function verify_percussion(until) {
  const loaded = await load_instrument_catalog(
    `${location.origin}/api/asset/instruments`,
  );
  const kit = loaded.catalog.drum_kits.find((k) => k.kit_key === "standard");
  check(kit.enabled && kit.available, "Standard production kit unavailable");
  const hits = kit.playback_assets.flatMap((asset) =>
    asset.hits.map((hit) => ({ asset, hit })),
  );
  let velocity_lookups = 0;
  for (const declared of kit.notes)
    for (let velocity = 1; velocity <= 127; velocity++) {
      const expected = hits.find(
        ({ hit }) =>
          hit.midi_note === declared.midi_note &&
          hit.velocity_min <= velocity &&
          velocity <= hit.velocity_max,
      );
      const note = {
        channel: 9,
        pitch: declared.midi_note,
        velocity,
        program: 0,
      };
      check(
        loaded.registry.can_assign([note], "original") === !!expected,
        "Production drum velocity coverage mismatch",
      );
      if (expected) {
        const sample = loaded.registry.resolve(note, "original");
        check(
          sample.sha256 === expected.asset.sha256 &&
            sample.offset_seconds === expected.hit.offset_seconds &&
            sample.duration_seconds === expected.hit.duration_seconds &&
            sample.gain === velocity / expected.hit.render_velocity,
          "Production drum lookup selected the wrong sample window",
        );
      }
      velocity_lookups++;
    }
  const baseline = await choke_reference(loaded.registry, false),
    choked = await choke_reference(loaded.registry, true);
  check(
    baseline > 1e-6 && choked < baseline * 0.01,
    `Production scheduler hi-hat choke failed: ${JSON.stringify({ baseline, choked })}`,
  );
  let fetches = 0;
  const player = new MidiPlaybackController({
    catalog_loader: async () => loaded,
    fetch_sample: (...args) => {
      fetches++;
      return fetch(...args);
    },
  });
  let report;
  try {
    player.load(beat);
    check(await player.refresh_catalog(), "Catalog refresh failed");
    check(
      await player.play(),
      `Production percussion failed: ${player.error?.message}`,
    );
    const context = player.context,
      origin = player.scheduler.origin;
    await context.capture_ready;
    await until(
      () => context.currentTime > origin + 0.25,
      "percussion audio clock",
    );
    const active = rms(context, origin + 0.015, origin + 0.08);
    check(
      active.samples > 0 && active.rms > 1e-5,
      "Production drums silent after short note-off",
    );
    check(
      !player.warnings.some((w) => w.code === "sample_shorter_than_note"),
      "False drum duration warning",
    );
    await until(() => player.status === "completed", "drum natural completion");
    const first_fetches = fetches;
    check(await player.play(), "Drum replay failed");
    check(fetches === first_fetches, "Drum replay refetched samples");
    await until(
      () => context.currentTime > player.scheduler.origin + 0.08,
      "replay clock",
    );
    const stopped = context.currentTime;
    player.stop();
    await sleep(250);
    const after_stop = rms(context, stopped + 0.04, stopped + 0.2);
    check(
      after_stop.samples > 0 && after_stop.peak < 1e-7,
      "Stop left drum tails audible",
    );
    player.load(open_hat);
    check(await player.play(), "Open hat failed");
    const tail_origin = player.scheduler.origin;
    await until(
      () => context.currentTime > tail_origin + 0.35,
      "open hat tail",
    );
    check(
      player.status === "playing",
      "Short note-off ended one-shot playback",
    );
    const tail = rms(context, tail_origin + 0.15, tail_origin + 0.3);
    check(tail.samples > 0 && tail.rms > 1e-6, "Open hat tail truncated");
    const disposed = context.currentTime;
    await fetch("/percussion_audio", { method: "POST", body: wav(context) });
    await player.dispose();
    report = {
      pass: true,
      catalog_revision: loaded.catalog.revision,
      kit_id: kit.id,
      velocity_lookups,
      active,
      after_stop,
      open_hat_tail: tail,
      offline_open_hat_tail_rms: baseline,
      offline_choked_tail_rms: choked,
      short_note_off_ignored: true,
      replay_without_fetch: true,
      natural_completion: true,
      disposed_at: disposed,
    };
  } finally {
    await player.dispose();
  }
  report.cleanup = resource_counts(contexts);
  check(
    Object.values(report.cleanup).every((v) => v === 0),
    "Production percussion leaked resources",
  );
  return report;
}
