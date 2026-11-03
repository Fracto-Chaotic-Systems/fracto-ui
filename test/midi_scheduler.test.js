import test from "node:test";
import assert from "node:assert/strict";
import MidiScheduler from "../src/pages/games/music/MidiScheduler.js";
import { schedule_midi_voice } from "../src/pages/games/music/MidiVoice.js";
import { FakeContext, fake_timers, note, song } from "./midi_audio_fakes.js";
const sample = {
  buffer: { duration: 10 },
  gain: 0.4,
  pan: 0.2,
  release_seconds: 0.6,
};
const drum = {
  ...sample,
  playback_mode: "one-shot",
  release_seconds: 0,
  instrument_id: "standard",
  choke_group: 1,
  duration_seconds: 2,
  offset_seconds: 0.25,
};

test("one-shot hits ignore short note-offs, preserve transients and finish at their window", () => {
  const context = new FakeContext();
  schedule_midi_voice(context, {}, note(0, 0.001, 9), drum, 0.05, () => {});
  assert.equal(context.sources[0].stop_at, 2.05);
  assert.deepEqual(context.gains[0].gain.events, [["set", 0.4, 0.05]]);
  context.currentTime = 0.5;
  assert.ok(
    schedule_midi_voice(context, {}, note(0, 0.001, 9), drum, 0.05, () => {}),
  );
  assert.ok(Math.abs(context.sources[1].started[1] - 0.7) < 1e-9);
});

test("choke cuts at the next hit time across tracks, with a short fade and no tail extension", () => {
  const context = new FakeContext(),
    timers = fake_timers(context);
  const scheduler = new MidiScheduler({
    context,
    destination: {},
    song: song([
      { ...note(0, 0.001, 9), track: 0 },
      { ...note(0.08, 0.081, 9), track: 1 },
    ]),
    samples: [drum, drum],
    ...timers,
  });
  scheduler.start();
  assert.ok(Math.abs(context.sources[0].stop_at - 0.135) < 1e-9);
  assert.deepEqual(context.gains[0].gain.events.slice(-3), [
    ["cancel", 0.13],
    ["set", 0.4, 0.13],
    ["ramp", 0, 0.135],
  ]);
  assert.equal(context.sources[1].stop_at, 2.13);
  timers.advance(0.14);
  assert.equal(scheduler.voices.size, 1);
  scheduler.stop();
  assert.equal(scheduler.choke_groups.size, 0);
  assert.equal(context.sources[1].onended, null);
});

test("different kits and exclusive classes remain polyphonic", () => {
  const context = new FakeContext(),
    timers = fake_timers(context);
  const scheduler = new MidiScheduler({
    context,
    destination: {},
    song: song([note(0, 0.01, 9), note(0.01, 0.02, 9), note(0.02, 0.03, 9)]),
    samples: [
      drum,
      { ...drum, instrument_id: "other" },
      { ...drum, choke_group: 2 },
    ],
    ...timers,
  });
  scheduler.start();
  assert.equal(scheduler.voices.size, 3);
  assert.equal(context.sources[0].stop_at, 2.05);
  scheduler.stop();
});

test("a rapid drum roll cannot revive or extend a hit already being choked", () => {
  const context = new FakeContext(),
    timers = fake_timers(context);
  const scheduler = new MidiScheduler({
    context,
    destination: {},
    song: song([
      note(0, 0.001, 9),
      note(0.08, 0.081, 9),
      note(0.082, 0.083, 9),
    ]),
    samples: [drum, drum, drum],
    ...timers,
  });
  scheduler.start();
  assert.equal(
    context.gains[0].gain.events.filter((event) => event[0] === "cancel")
      .length,
    1,
  );
  assert.ok(Math.abs(context.sources[0].stop_at - 0.135) < 1e-9);
  assert.ok(Math.abs(context.sources[1].stop_at - 0.137) < 1e-9);
  scheduler.stop();
  assert.equal(scheduler.voices.size, 0);
  assert.equal(scheduler.choke_groups.size, 0);
});

test("drum completion waits for the full tail after the song ends", () => {
  const context = new FakeContext(),
    timers = fake_timers(context);
  let completed = 0;
  const scheduler = new MidiScheduler({
    context,
    destination: {},
    song: song([note(0, 0.001, 9)], 0.1),
    samples: [drum],
    on_complete: () => completed++,
    ...timers,
  });
  scheduler.start();
  timers.advance(0.2);
  assert.equal(completed, 0);
  timers.advance(2.1);
  assert.equal(completed, 1);
  assert.equal(scheduler.choke_groups.size, 0);
});

test("lookahead schedules independent voices for overlapping pitches and channels", () => {
  const context = new FakeContext();
  const timers = fake_timers(context);
  const scheduler = new MidiScheduler({
    context,
    destination: {},
    song: song([note(), note(0, 2, 1), note(0.1, 3), note(2, 3)], 3),
    samples: Array(4).fill(sample),
    ...timers,
  });
  scheduler.start();
  assert.equal(context.sources.length, 2);
  assert.notEqual(context.sources[0], context.sources[1]);
  assert.deepEqual(context.sources[0].started, [0.05, 0]);
  assert.equal(context.sources[0].stop_at, 1.65);
  assert.equal(context.sources[1].stop_at, 2.65);
  timers.advance(0.1);
  assert.equal(context.sources.length, 3);
  timers.advance(1);
  assert.equal(context.sources.length, 3);
  scheduler.stop();
  assert.equal(timers.timers.size, 0);
  assert.ok(
    context.sources.every((source) => source.stopped && source.disconnected),
  );
});

test("a delayed pump skips expired notes and resumes an active note at its sample offset", () => {
  const context = new FakeContext();
  const timers = fake_timers(context);
  const scheduler = new MidiScheduler({
    context,
    destination: {},
    song: song([note(1, 1.2), note(1.5, 3)], 3),
    samples: [sample, sample],
    ...timers,
  });
  scheduler.start();
  assert.equal(context.sources.length, 0);
  timers.advance(2);
  assert.equal(context.sources.length, 1);
  assert.ok(Math.abs(context.sources[0].started[1] - 0.45) < 1e-9);
  assert.equal(context.sources[0].started[0], 2);
  scheduler.stop();
});

test("completion waits for release tails and trailing silence, then clears its timer", () => {
  const context = new FakeContext();
  const timers = fake_timers(context);
  let completed = 0;
  const scheduler = new MidiScheduler({
    context,
    destination: {},
    song: song([note(0, 0.1)], 2),
    samples: [sample],
    on_complete: () => completed++,
    ...timers,
  });
  scheduler.start();
  timers.advance(0.2);
  assert.equal(completed, 0);
  assert.equal(scheduler.voices.size, 1);
  timers.advance(1);
  assert.equal(scheduler.voices.size, 0);
  assert.equal(completed, 0);
  timers.advance(2.1);
  assert.equal(completed, 1);
  assert.equal(timers.timers.size, 0);
});

test("dense input has a bounded pump and Stop cancels future scheduled sources", () => {
  const context = new FakeContext();
  const timers = fake_timers(context);
  const notes = Array.from({ length: 600 }, () => note());
  const scheduler = new MidiScheduler({
    context,
    destination: {},
    song: song(notes),
    samples: notes.map(() => sample),
    ...timers,
  });
  scheduler.start();
  assert.equal(context.sources.length, 512);
  scheduler.stop();
  timers.advance(1);
  assert.equal(context.sources.length, 512);
  assert.equal(scheduler.voices.size, 0);
});

test("a source start failure disconnects the voice graph", () => {
  const context = new FakeContext();
  const create = context.createBufferSource.bind(context);
  context.createBufferSource = () => {
    const source = create();
    source.start = () => {
      throw new Error("start failed");
    };
    return source;
  };
  assert.throws(
    () => schedule_midi_voice(context, {}, note(), sample, 0.05, () => {}),
    /start failed/,
  );
  assert.ok(context.sources[0].disconnected);
  assert.ok(context.gains[0].disconnected);
  assert.ok(context.pans[0].disconnected);
});

test("default browser timers are invoked without a scheduler receiver", () => {
  const original_set = globalThis.setInterval;
  const original_clear = globalThis.clearInterval;
  let started = 0;
  let cleared = 0;
  try {
    globalThis.setInterval = function () {
      assert.equal(this, undefined);
      started++;
      return 123;
    };
    globalThis.clearInterval = function (timer) {
      assert.equal(this, undefined);
      assert.equal(timer, 123);
      cleared++;
    };
    const scheduler = new MidiScheduler({
      context: new FakeContext(),
      destination: {},
      song: song(),
      samples: [sample],
    });
    scheduler.start();
    scheduler.stop();
    assert.equal(started, 1);
    assert.equal(cleared, 1);
  } finally {
    globalThis.setInterval = original_set;
    globalThis.clearInterval = original_clear;
  }
});

test("long notes use absolute context time without the legacy nine-second cutoff", () => {
  const context = new FakeContext();
  context.currentTime = 100;
  const timers = fake_timers(context);
  const scheduler = new MidiScheduler({
    context,
    destination: {},
    song: song([note(0, 12)], 12),
    samples: [{ ...sample, buffer: { duration: 20 } }],
    ...timers,
  });
  scheduler.start();
  assert.equal(context.sources[0].started[0], 100.05);
  assert.ok(Math.abs(context.sources[0].stop_at - 112.65) < 1e-9);
  assert.deepEqual(context.gains[0].gain.events.at(-2), ["set", 0.4, 112.05]);
  scheduler.stop();
});

test("a mid-chord scheduling failure stops earlier sources and reports one error", () => {
  const context = new FakeContext();
  const timers = fake_timers(context);
  const create = context.createBufferSource.bind(context);
  let attempts = 0;
  context.createBufferSource = () => {
    if (++attempts === 2) throw new Error("allocation failed");
    return create();
  };
  const errors = [];
  const scheduler = new MidiScheduler({
    context,
    destination: {},
    song: song([note(), note()]),
    samples: [sample, sample],
    on_error: (error) => errors.push(error.message),
    ...timers,
  });
  scheduler.start();
  assert.deepEqual(errors, ["allocation failed"]);
  assert.equal(context.sources[0].stopped, true);
  assert.equal(context.sources[0].disconnected, true);
  assert.equal(scheduler.voices.size, 0);
  assert.equal(timers.timers.size, 0);
});

test("late scheduler skips notes whose finite samples have already ended", () => {
  const context = new FakeContext();
  const timers = fake_timers(context);
  const scheduler = new MidiScheduler({
    context,
    destination: {},
    song: song([note(1, 10)], 10),
    samples: [{ ...sample, buffer: { duration: 0.5 } }],
    ...timers,
  });
  scheduler.start();
  timers.advance(3);
  assert.equal(context.sources.length, 0);
  scheduler.stop();
});
