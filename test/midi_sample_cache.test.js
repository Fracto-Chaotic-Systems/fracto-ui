import test from "node:test";
import assert from "node:assert/strict";
import { piano_sample } from "../src/pages/games/music/MidiPianoSamples.js";
import MidiSampleCache from "../src/pages/games/music/MidiSampleCache.js";
import {
  FakeContext,
  note,
  deferred,
  flush,
  response,
} from "./midi_audio_fakes.js";

test("sample rules preserve layer boundaries and explicitly reject unsupported notes", () => {
  for (const [velocity, layer] of [
    [1, "p"],
    [39, "p"],
    [40, "mp"],
    [79, "mp"],
    [80, "mf"],
    [119, "mf"],
    [120, "f"],
    [127, "f"],
  ]) {
    assert.equal(
      piano_sample({ ...note(), velocity }, "https://example.test/piano/").url,
      `https://example.test/piano/${layer}/GrandB_${layer}_060_mono.mp3`,
    );
  }
  assert.throws(() => piano_sample(note(0, 1, 9)), /Percussion/);
  assert.throws(() => piano_sample(note(0, 1, 0, 12)), /21 through 108/);
});

test("unique samples are decoded once, reused for replay, and previous songs are pruned", async () => {
  let fetched = 0;
  const cache = new MidiSampleCache({
    fetch_sample: async () => {
      fetched++;
      return response();
    },
  });
  const context = new FakeContext();
  const signal = new AbortController().signal;
  const first = await cache.prepare([note(), note()], context, signal);
  assert.equal(fetched, 1);
  assert.equal(first[0].buffer, first[1].buffer);
  await cache.prepare([note()], context, signal);
  assert.equal(fetched, 1);
  await cache.prepare([note(0, 1, 0, 61)], context, signal);
  assert.equal(fetched, 2);
  assert.equal(cache.buffers.size, 1);
  cache.clear();
  assert.equal(cache.bytes, 0);
});

test("download concurrency is bounded and cancellation stops pending work", async () => {
  const pending = deferred();
  let fetched = 0;
  const cache = new MidiSampleCache({
    fetch_sample: async () => {
      fetched++;
      return pending.promise;
    },
    concurrency: 2,
  });
  const abort = new AbortController();
  const promise = cache.prepare(
    [60, 61, 62, 63].map((p) => note(0, 1, 0, p)),
    new FakeContext(),
    abort.signal,
  );
  await flush();
  assert.equal(fetched, 2);
  abort.abort();
  pending.resolve(response());
  await assert.rejects(promise, /cancelled/);
  assert.equal(cache.buffers.size, 0);
  assert.equal(fetched, 2);
});

test("failures are retryable and decoding respects the memory limit", async () => {
  let fail = true;
  const cache = new MidiSampleCache({
    fetch_sample: async () => (fail ? { ok: false, status: 403 } : response()),
  });
  const context = new FakeContext();
  const signal = new AbortController().signal;
  await assert.rejects(
    cache.prepare([note()], context, signal),
    /download or decode/,
  );
  assert.equal(cache.buffers.size, 0);
  fail = false;
  await cache.prepare([note()], context, signal);
  const small = new MidiSampleCache({
    fetch_sample: async () => response(),
    max_bytes: 1,
  });
  await assert.rejects(
    small.prepare([note()], context, signal),
    /memory limit/,
  );
  assert.equal(small.buffers.size, 0);
});

test("decode failure is retryable and an empty decoded sample is rejected", async () => {
  const cache = new MidiSampleCache({ fetch_sample: async () => response() });
  const context = new FakeContext();
  const signal = new AbortController().signal;
  context.decodeAudioData = async () => {
    throw new Error("bad MP3");
  };
  await assert.rejects(
    cache.prepare([note()], context, signal),
    /download or decode/,
  );
  assert.equal(cache.buffers.size, 0);
  context.decodeAudioData = async () => ({
    duration: 0,
    length: 0,
    numberOfChannels: 1,
  });
  await assert.rejects(
    cache.prepare([note()], context, signal),
    /usable audio/,
  );
  context.decodeAudioData = async () => context.buffer;
  await cache.prepare([note()], context, signal);
  assert.equal(cache.buffers.size, 1);
});

test("stalled fetch, response body and decoder time out without retaining late buffers", async () => {
  for (const stage of ["fetch", "body", "decode"]) {
    const pending = deferred(),
      context = new FakeContext();
    const cache = new MidiSampleCache({
      load_timeout_ms: 10,
      fetch_sample: async () => {
        if (stage === "fetch") return pending.promise;
        if (stage === "body")
          return { ok: true, arrayBuffer: () => pending.promise };
        return response();
      },
    });
    if (stage === "decode") context.decodeAudioData = () => pending.promise;
    await assert.rejects(
      cache.prepare([note()], context, new AbortController().signal),
      { code: "sample_load_timeout" },
    );
    pending.resolve(
      stage === "decode"
        ? context.buffer
        : stage === "body"
          ? new ArrayBuffer(1)
          : response(),
    );
    await flush();
    assert.equal(cache.buffers.size, 0);
    assert.equal(cache.bytes, 0);
    assert.equal(cache.preparation, null);
  }
});

test("Stop settles preparation even when the transport ignores abort; retry reports progress", async () => {
  const pending = deferred(),
    controller = new AbortController(),
    context = new FakeContext();
  const cache = new MidiSampleCache({ fetch_sample: () => pending.promise });
  const loading = cache.prepare([note()], context, controller.signal);
  await flush();
  controller.abort();
  await assert.rejects(loading, { code: "cancelled" });
  cache.fetch_sample = async () => response();
  const progress = [];
  await cache.prepare([note(), note()], context, new AbortController().signal, {
    on_progress: (value) => progress.push(value),
  });
  assert.deepEqual(progress, [
    { completed: 0, total: 1 },
    { completed: 1, total: 1 },
  ]);
  pending.resolve(response());
  await flush();
  assert.equal(cache.buffers.size, 1);
  cache.clear();
});
