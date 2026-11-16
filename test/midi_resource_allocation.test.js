import test from "node:test";
import assert from "node:assert/strict";
import MidiSampleCache from "../src/pages/games/music/MidiSampleCache.js";
import MidiSampleSession from "../src/pages/games/music/MidiSampleSession.js";
import MidiScheduler from "../src/pages/games/music/MidiScheduler.js";
import {
  FakeContext,
  note,
  song,
  deferred,
  flush,
  response,
} from "./midi_audio_fakes.js";

const registry = {
  resolve(n) {
    return {
      cache_key: String(n.pitch),
      url: `https://example.test/${n.pitch}.wav`,
      asset_frames: 48000,
      asset_sample_rate: 48000,
      asset_channels: 1,
      encoded_bytes: 8,
      duration_seconds: 1,
      release_seconds: 0.15,
      gain: 1,
      pan: 0,
    };
  },
};
const context = () => {
  const value = new FakeContext();
  value.sampleRate = 48000;
  value.buffer = {
    length: 48000,
    duration: 1,
    numberOfChannels: 1,
    sampleRate: 48000,
  };
  return value;
};

test("rolling sessions evict completed assets, pin active voices, and retain no per-note buffers", async () => {
  const audio = context();
  const cache = new MidiSampleCache({
    fetch_sample: async () => response(),
    max_bytes: 400000,
  });
  const notes = [note(0, 1, 0, 60), note(8, 9, 0, 61), note(16, 17, 0, 62)];
  const session = new MidiSampleSession(
    cache,
    notes,
    audio,
    new AbortController().signal,
    { registry, assignments: {} },
  );
  assert.equal(session.mode, "windowed");
  await session.prepare();
  const first = session.acquire(0);
  await session.prepare(8, 1);
  assert.deepEqual([...cache.buffers.keys()].sort(), ["60", "61"]);
  await session.prepare(16, 2);
  assert.deepEqual([...cache.buffers.keys()].sort(), ["60", "62"]);
  assert.equal(first.buffer, cache.buffers.get("60"));
  first.release_buffer();
  first.release_buffer();
  await session.prepare(16, 2);
  assert.deepEqual([...cache.buffers.keys()], ["62"]);
  assert.ok(
    session.samples.every((sample) => !Object.hasOwn(sample, "buffer")),
  );
  assert.ok(cache.budget.peak_bytes <= cache.max_bytes);
  assert.equal(session.pins.size, 0);
});

test("prefetch horizon shrinks to fit instead of reserving the entire song", async () => {
  const cache = new MidiSampleCache({
    fetch_sample: async () => response(),
    max_bytes: 400000,
  });
  const notes = [60, 61, 62, 63, 64].map((pitch, i) =>
    note(i * 0.2, i * 0.2 + 0.1, 0, pitch),
  );
  const session = new MidiSampleSession(
    cache,
    notes,
    context(),
    new AbortController().signal,
    { registry, assignments: {} },
  );
  await session.prepare();
  assert.equal(session.mode, "windowed");
  assert.equal(cache.buffers.size, 2);
  assert.ok(cache.bytes < cache.max_bytes);
});

test("cancelled native decoding retains its reservation and slot across clear and retry", async () => {
  const audio = context();
  const pending = deferred();
  let decodes = 0;
  audio.decodeAudioData = async () =>
    ++decodes === 1 ? pending.promise : audio.buffer;
  const cache = new MidiSampleCache({
    concurrency: 1,
    fetch_sample: async () => response(),
  });
  const abort = new AbortController();
  const first = cache.prepare([note()], audio, abort.signal, { registry });
  await flush();
  assert.equal(decodes, 1);
  abort.abort();
  await assert.rejects(first, { code: "cancelled" });
  cache.clear();
  assert.equal(cache.budget.active, 1);
  assert.ok(cache.budget.reserved > 0);
  const second = cache.prepare(
    [note(0, 1, 0, 61)],
    audio,
    new AbortController().signal,
    { registry },
  );
  await flush();
  assert.equal(decodes, 1);
  pending.resolve(audio.buffer);
  await second;
  assert.equal(decodes, 2);
  assert.deepEqual([...cache.buffers.keys()], ["61"]);
  assert.equal(cache.budget.active, 0);
  assert.equal(cache.budget.reserved, 0);
  assert.equal(cache.budget.peak_jobs, 1);
});

test("oversized encoded responses fail before reading the body or decoding", async () => {
  let read = false;
  const cache = new MidiSampleCache({
    fetch_sample: async () => ({
      ok: true,
      headers: { get: () => "100000000" },
      arrayBuffer: async () => {
        read = true;
        return new ArrayBuffer(8);
      },
    }),
  });
  const audio = context();
  await assert.rejects(
    cache.prepare([note()], audio, new AbortController().signal, { registry }),
    { code: "sample_memory_limit" },
  );
  assert.equal(read, false);
  assert.equal(audio.decoded, 0);
  assert.equal(cache.budget.reserved, 0);
});

test("a missing sample freezes the audio clock, waits, and schedules the same note without advancing", async () => {
  const audio = context();
  let suspended = 0;
  audio.suspend = async () => {
    suspended++;
    audio.state = "suspended";
  };
  const pending = deferred();
  let ready = false;
  let releases = 0;
  const state = [];
  const session = {
    prefetch() {},
    acquire: () =>
      ready
        ? {
            buffer: audio.buffer,
            gain: 1,
            pan: 0,
            release_seconds: 0.15,
            release_buffer: () => releases++,
          }
        : null,
    async prepare() {
      await pending.promise;
      ready = true;
    },
  };
  const scheduler = new MidiScheduler({
    context: audio,
    destination: {},
    song: song(),
    sample_session: session,
    on_buffering: (value) => state.push(value),
    on_error: (error) => {
      throw error;
    },
    set_interval: () => 1,
    clear_interval() {},
  });
  scheduler.start();
  await flush();
  assert.equal(suspended, 1);
  assert.equal(scheduler.index, 0);
  pending.resolve();
  await flush();
  assert.equal(scheduler.index, 1);
  assert.equal(scheduler.stats.scheduled, 1);
  assert.equal(scheduler.stats.skipped, 0);
  assert.deepEqual(state, [true, false]);
  scheduler.stop();
  assert.equal(releases, 1);
});

test("Stop during buffering cannot resume audio or start a late voice", async () => {
  const audio = context();
  audio.suspend = async () => {};
  const pending = deferred();
  const scheduler = new MidiScheduler({
    context: audio,
    destination: {},
    song: song(),
    sample_session: {
      prefetch() {},
      acquire: () => null,
      prepare: () => pending.promise,
    },
    set_interval: () => 1,
    clear_interval() {},
  });
  scheduler.start();
  await flush();
  scheduler.stop();
  pending.resolve();
  await flush();
  assert.equal(audio.resume_count, 0);
  assert.equal(audio.sources.length, 0);
});
