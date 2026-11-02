import MidiPlaybackController from "../../src/pages/games/music/MidiPlaybackController.js";
import { load_instrument_catalog } from "../../src/pages/games/music/MidiInstrumentCatalog.js";
import { contexts, rms } from "./Capture.js";
import { resource_counts } from "./ResourceChecks.js";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
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
const chord = file([
  0, 176, 64, 127, 0, 144, 60, 100, 0, 144, 64, 100, 0, 144, 67, 100, 96, 144,
  60, 90, 0x81, 0x10, 128, 60, 0, 0, 128, 64, 0, 0, 128, 67, 0, 96, 128, 60, 0,
  0x81, 0x10, 176, 64, 0, 0, 255, 47, 0,
]);
const held = file([0, 144, 60, 100, 0xcb, 0, 128, 60, 0, 0, 255, 47, 0]);
export async function verify_asset_engine(until) {
  const loaded = await load_instrument_catalog(
    `${window.location.origin}/api/asset/instruments`,
  );
  let fetches = 0;
  const player = new MidiPlaybackController({
    catalog_loader: async () => loaded,
    fetch_sample: async (url, options) => {
      assert(options.credentials === "include", "Missing audio credentials");
      fetches++;
      return fetch(url, options);
    },
  });
  let context;
  try {
    player.load(chord);
    await player.refresh_catalog();
    const route = Object.keys(player.instruments.assignments)[0];
    assert(
      player.set_instrument(route, "asset-flute"),
      "Flute assignment unavailable to probe",
    );
    assert(await player.play(), "Native chunk playback failed");
    context = contexts.at(-1);
    const origin = context.scheduled_starts[0].when;
    await until(
      () => context.currentTime >= origin + 0.4,
      "native audio clock",
    );
    await until(
      () => rms(context, origin + 0.08, origin + 0.28).samples > 0,
      "captured flute audio",
    );
    const voices = context.product_nodes.filter((node) => node.buffer);
    assert(
      voices.length === 4 &&
        new Set(voices.map((node) => node.buffer)).size === 1,
      "Shared chunk polyphony failed",
    );
    const active = rms(context, origin + 0.08, origin + 0.28);
    assert(
      active.samples > 0 && active.rms > 0.0001,
      `Native flute output was silent: ${JSON.stringify({ active, state: context.state, origin, now: context.currentTime, capture_blocks: context.captured.length })}`,
    );
    await until(() => player.status === "completed", "asset chord completion");
    await sleep(200);
    assert(await player.play(), "Native chunk replay failed");
    await sleep(180);
    const stop = context.currentTime;
    player.stop();
    await sleep(280);
    const stopped = rms(context, stop + 0.07, stop + 0.23);
    assert(
      stopped.samples > 0 && stopped.peak < 0.000001,
      "Stop left chunk output",
    );
    player.load(held);
    player.set_instrument(
      Object.keys(player.instruments.assignments)[0],
      "asset-flute",
    );
    assert(await player.play(), "Held chunk playback failed");
    assert(
      player.warnings.some(
        (warning) => warning.code === "sample_shorter_than_note",
      ),
      "Missing bounded-note warning",
    );
    const start = context.scheduled_starts.at(-1),
      source = loaded.registry.resolve(player.song.notes[0], "asset-flute");
    assert(
      start.duration <= source.duration_seconds + 1e-6,
      "Source hardware duration crossed its note window",
    );
    await until(
      () => context.currentTime >= start.when + source.duration_seconds + 0.35,
      "held-note boundary",
    );
    await until(
      () =>
        context.captured.some(
          (chunk) => chunk.time >= start.when + source.duration_seconds + 0.25,
        ),
      "captured held-note boundary",
    );
    const bounded = rms(
      context,
      start.when + source.duration_seconds + 0.07,
      start.when + source.duration_seconds + 0.25,
    );
    assert(
      player.status === "playing",
      "Long MIDI note did not remain in progress for boundary check",
    );
    assert(
      bounded.samples > 0 && bounded.peak < 0.000001,
      `Bounded note output failed: ${JSON.stringify({ bounded, start, source_duration: source.duration_seconds, now: context.currentTime })}`,
    );
    assert(fetches === 1, "Replay/replacement refetched the shared chunk");
    await player.dispose();
    await sleep(100);
    const cleanup = resource_counts(contexts);
    assert(
      Object.values(cleanup).every((count) => count === 0),
      `Resource leak: ${JSON.stringify(cleanup)}`,
    );
    return {
      context,
      report: {
        pass: true,
        server_entries: loaded.catalog.instruments.length,
        test_only_prepared_source_opt_in: false,
        enabled_sources: loaded.catalog.instruments.filter(
          (item) => item.enabled,
        ).length,
        native_sample_rate: context.sampleRate,
        native_decoded_sample_rate: voices[0].buffer.sampleRate,
        shared_native_buffers: 1,
        simultaneous_voices: 4,
        chunk_fetches: fetches,
        active,
        after_stop: stopped,
        after_note_boundary: bounded,
        bounded_note_seconds: source.duration_seconds,
        hardware_duration_seconds: start.duration,
        next_pitch_bleed: false,
        natural_completion: true,
        replay: true,
        cleanup,
      },
    };
  } finally {
    await player.dispose();
  }
}
