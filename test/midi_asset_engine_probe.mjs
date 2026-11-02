import { Buffer } from "node:buffer";
// Real HTTP/catalog/WAV integration with a deterministic clock/decoder stub.
// This is not a browser audio-output test and never enables library entries.
import http from "node:http";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import assert from "node:assert/strict";
import { create_instrument_router } from "../../fracto-asset-server/handlers/instruments.js";
import { load_instrument_catalog } from "../src/pages/games/music/MidiInstrumentCatalog.js";
import MidiPlaybackController from "../src/pages/games/music/MidiPlaybackController.js";
import { FakeContext, fake_timers, note } from "./midi_audio_fakes.js";
const require = createRequire(
  new URL("../../fracto-asset-server/package.json", import.meta.url),
);
const express = require("express");
const { values } = parseArgs({
  options: {
    output: { type: "string" },
    prepared: { type: "boolean", default: false },
  },
});
const token = randomBytes(24).toString("hex");
const app = express();
app.use(
  "/api/asset/instruments",
  (req, res, next) =>
    req.get("x-fracto-service-token") === token ? next() : res.sendStatus(401),
  create_instrument_router({ public_url: "" }),
);
const server = http.createServer(app);
const context = new FakeContext();
context.sampleRate = 44100;
context.decodeAudioData = async (bytes) => {
  const wav = Buffer.from(bytes);
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.readUInt16LE(22), 1);
  const rate = wav.readUInt32LE(24),
    frames = wav.readUInt32LE(40) / 2;
  context.decoded++;
  return {
    sampleRate: rate,
    length: frames,
    numberOfChannels: 1,
    duration: frames / rate,
  };
};
let player;
try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/asset/instruments`;
  const authorized_fetch = (url, init) =>
    fetch(url, {
      ...init,
      headers: { ...init.headers, "x-fracto-service-token": token },
    });
  const loaded = await load_instrument_catalog(url, {
    fetch_catalog: authorized_fetch,
    allow_prepared: values.prepared,
  });
  let mappings = 0;
  const velocity = { p: 1, mp: 30, mf: 60, f: 90, ff: 127 };
  for (const instrument of loaded.catalog.instruments) {
    if (!loaded.registry.providers[`asset-${instrument.id}`]) continue;
    for (const asset of instrument.playback_assets) {
      for (const pitch of asset.notes) {
        const sample = loaded.registry.resolve(
          {
            ...note(0, 0.5, 0, pitch.midi_pitch),
            velocity: velocity[asset.velocity_layer] ?? 100,
          },
          `asset-${instrument.id}`,
        );
        assert.equal(new URL(sample.url).searchParams.get("v"), asset.sha256);
        assert.equal(sample.offset_seconds, pitch.offset_seconds);
        assert.equal(sample.duration_seconds, pitch.duration_seconds);
        mappings++;
      }
    }
  }
  let fetches = 0;
  const timers = fake_timers(context);
  player = new MidiPlaybackController({
    catalog_loader: async () => loaded,
    create_context: () => context,
    fetch_sample: async (url, init) => {
      assert.equal(init.credentials, "include");
      fetches++;
      return authorized_fetch(url, init);
    },
    ...timers,
  });
  const track = [
    0, 176, 64, 127, 0, 144, 60, 100, 0, 144, 64, 100, 0, 144, 67, 100, 96, 144,
    60, 90, 0x81, 0x10, 128, 60, 0, 0, 128, 64, 0, 0, 128, 67, 0, 96, 128, 60,
    0, 0x81, 0x10, 176, 64, 0, 0, 255, 47, 0,
  ];
  const file = new Uint8Array([
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
  player.load(file);
  assert.equal(await player.refresh_catalog(), true);
  assert.equal(context.resume_count, 0);
  const route = Object.keys(player.instruments.assignments)[0];
  const sound_id =
    values.prepared && loaded.registry.providers["asset-fluidr3-gm-flute"]
      ? "fluidr3-gm-flute"
      : "flute";
  assert.equal(player.set_instrument(route, `asset-${sound_id}`), true);
  assert.equal(await player.play(), true);
  timers.advance(0.2);
  assert.equal(context.sources.length, 4);
  assert.equal(fetches, 1);
  assert.equal(context.decoded, 1);
  const pitches = loaded.catalog.instruments
    .find((instrument) => instrument.id === sound_id)
    .playback_assets.flatMap((asset) => asset.notes);
  for (let i = 0; i < player.song.notes.length; i++) {
    const midi = player.song.notes[i],
      source = context.sources[i],
      window = pitches.find((pitch) => pitch.midi_pitch === midi.pitch);
    const late = Math.max(0, source.started[0] - (0.05 + midi.start_seconds));
    assert.ok(
      Math.abs(source.started[1] - window.offset_seconds - late) < 1e-8,
    );
    assert.ok(
      source.stop_at <=
        0.05 + midi.start_seconds + window.duration_seconds + 1e-8,
    );
  }
  const decoded_bytes = player.cache.bytes;
  player.stop();
  assert.equal(player.mixer.buses.size, 0);
  assert.ok(
    context.sources.every((source) => source.stopped && source.disconnected),
  );
  assert.equal(await player.play(), true);
  assert.equal(fetches, 1);
  assert.equal(context.decoded, 1);
  await player.dispose();
  assert.equal(context.close_count, 1);
  assert.equal(timers.timers.size, 0);
  assert.equal(player.cache.bytes, 0);
  const report = {
    pass: true,
    server_library_entries: loaded.catalog.instruments.length,
    validated_pitch_mappings: mappings,
    test_only_prepared_source_opt_in: values.prepared,
    enabled_sources: loaded.catalog.instruments.filter((item) => item.enabled)
      .length,
    proxy_prefix_preserved: true,
    playback_provider: `asset-${sound_id}`,
    actual_wav_fetches: fetches,
    decoded_chunks: context.decoded,
    simultaneous_voices: 4,
    decoded_bytes,
    replay_reused_chunk: true,
    context_close_count: context.close_count,
    timers_after_dispose: timers.timers.size,
    verification:
      "Real HTTP/catalog/checksum/WAV bytes with deterministic clock and WAV-header decoder stub; browser audio output remains pending.",
  };
  if (values.output)
    await fs.writeFile(values.output, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await player?.dispose();
  await new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  });
}
