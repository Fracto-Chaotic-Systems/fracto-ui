import test from "node:test";
import assert from "node:assert/strict";
import {
  active_track_notes,
  follow_track_scroll,
  event_at_time,
  build_track_event_lanes,
  start_track_clock,
} from "../src/pages/games/music/MidiTrackPlayback.js";
import { index_track_notes } from "../src/pages/games/music/MidiTrackGeometry.js";

test("highlight boundaries distinguish held keys, sustain, repeated pitches and silence", () => {
  const first = {
    id: "a",
    start_seconds: 0,
    key_release_seconds: 0.5,
    end_seconds: 1,
  };
  const second = {
    id: "b",
    start_seconds: 0.25,
    key_release_seconds: 0.75,
    end_seconds: 0.75,
  };
  const index = index_track_notes([first, second]);
  assert.deepEqual(active_track_notes(index, 0.5, true), {
    held: [second],
    sustained: [first],
  });
  assert.deepEqual(active_track_notes(index, 0.75, true), {
    held: [],
    sustained: [first],
  });
  assert.deepEqual(active_track_notes(index, 1, true), {
    held: [],
    sustained: [],
  });
  assert.deepEqual(active_track_notes(index, 0.5, false), {
    held: [],
    sustained: [],
  });
});

test("follow positioning uses viewport geometry and clamps to the song boundaries", () => {
  assert.equal(follow_track_scroll(5, 100, 0, 800, 2000), 0);
  assert.equal(follow_track_scroll(9, 100, 0, 800, 2000), 700);
  assert.equal(follow_track_scroll(20, 100, 0, 800, 2000), 1200);
  assert.equal(follow_track_scroll(0, 100, 700, 800, 2000), 0);
  assert.equal(follow_track_scroll(1, 100, 0, 800, 800), 0);
});

test("event lookup resolves simultaneous events deterministically and supports empty lanes", () => {
  const events = [
    { seconds: 0, value: 1 },
    { seconds: 1, value: 2 },
    { seconds: 1, value: 3 },
  ];
  assert.equal(event_at_time(events, 0.5), events[0]);
  assert.equal(event_at_time(events, 1), events[2]);
  assert.equal(event_at_time([], 0), null);
  assert.equal(event_at_time([{ seconds: 1 }], 0), null);
});

test("event lanes preserve default/changed tempo and meter, and independently close channel sustain", () => {
  const song = {
    duration_seconds: 3,
    tempos: [
      {
        id: "t0",
        seconds: 0,
        microseconds_per_quarter: 500000,
        inferred: true,
      },
      { id: "t1", seconds: 1, microseconds_per_quarter: 1000000 },
    ],
    time_signatures: [
      { id: "m0", seconds: 0, numerator: 4, denominator: 4, inferred: true },
    ],
    pedal_events: [
      { seconds: 0, channel: 0, down: true },
      { seconds: 0.2, channel: 1, down: true },
      { seconds: 0.3, channel: 0, down: true },
      { seconds: 1, channel: 0, down: false, controller: 121 },
      { seconds: 2, channel: 1, down: false },
      { seconds: 2.5, channel: 0, down: true },
    ],
  };
  const lanes = build_track_event_lanes(song);
  assert.deepEqual(
    lanes.map((l) => l.kind),
    ["tempo", "meter", "pedal", "pedal"],
  );
  assert.deepEqual(
    lanes[0].segments.map((s) => [s.start_seconds, s.end_seconds]),
    [
      [0, 1],
      [1, 3],
    ],
  );
  assert.equal(lanes[1].segments[0].inferred, true);
  assert.deepEqual(
    lanes[2].segments.map((s) => [s.start_seconds, s.end_seconds]),
    [
      [0, 1],
      [2.5, 3],
    ],
  );
  assert.deepEqual(
    lanes[3].segments.map((s) => [s.start_seconds, s.end_seconds]),
    [[0.2, 2]],
  );
});

test("files without pedal events have a stable empty lane", () => {
  const lanes = build_track_event_lanes({
    duration_seconds: 0,
    tempos: [{ seconds: 0 }],
    time_signatures: [{ seconds: 0 }],
    pedal_events: [],
  });
  assert.equal(lanes[2].channel, null);
  assert.equal(lanes[2].index, null);
  assert.deepEqual(lanes[2].events, []);
});

const frames = () => {
  let next = 0;
  const queued = new Map();
  return {
    queued,
    request_frame: (callback) => {
      queued.set(++next, callback);
      return next;
    },
    cancel_frame: (id) => queued.delete(id),
    tick: (timestamp) => {
      const [id, callback] = queued.entries().next().value;
      queued.delete(id);
      callback(timestamp);
    },
  };
};

test("one animation loop samples the audio clock without integrating frame time and cancels on cleanup", () => {
  const animation = frames(),
    published = [];
  let snapshot = {
    status: "playing",
    position_seconds: 10,
    clock_started: true,
    playback_id: 1,
  };
  const stop = start_track_clock(
    () => snapshot,
    (frame) => published.push(frame),
    animation,
  );
  assert.equal(animation.queued.size, 1);
  animation.tick(0);
  snapshot = { ...snapshot, position_seconds: 10.37 };
  animation.tick(40);
  assert.deepEqual(
    published.map((p) => p.position_seconds),
    [10, 10.37],
  );
  snapshot = { ...snapshot, position_seconds: 10.37 };
  animation.tick(80);
  assert.equal(published.at(-1).position_seconds, 10.37);
  stop();
  assert.equal(animation.queued.size, 0);
});

test("completion/disposal stops requesting frames and cancelled callbacks cannot publish", () => {
  const animation = frames();
  let published = 0;
  let snapshot = { status: "playing" };
  const stop = start_track_clock(
    () => snapshot,
    () => published++,
    animation,
  );
  const callback = [...animation.queued.values()][0];
  stop();
  callback(0);
  assert.equal(published, 0);
  assert.equal(animation.queued.size, 0);
  start_track_clock(
    () => snapshot,
    () => published++,
    animation,
  );
  snapshot = { status: "completed" };
  animation.tick(0);
  assert.equal(animation.queued.size, 0);
  start_track_clock(
    () => null,
    () => published++,
    animation,
  );
  animation.tick(0);
  assert.equal(animation.queued.size, 0);
});
