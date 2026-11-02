import test from "node:test";
import assert from "node:assert/strict";
import MidiParser from "midi-parser-js";
import {
  events_from_midi,
  MidiFileError,
} from "../src/pages/games/music/MidiEvents.js";
import {
  MAX_MIDI_BYTES,
  MAX_MIDI_EVENTS,
} from "../src/pages/games/music/MidiValidation.js";

const vlq = (value) => {
  const bytes = [value & 127];
  while ((value >>>= 7)) bytes.unshift((value & 127) | 128);
  return bytes;
};
const event = (delta, ...data) => [...vlq(delta), ...data];
const end = (delta = 0) => event(delta, 255, 47, 0);
const on = (delta, pitch = 60, channel = 0, velocity = 100) =>
  event(delta, 0x90 + channel, pitch, velocity);
const off = (delta, pitch = 60, channel = 0) =>
  event(delta, 0x80 + channel, pitch, 0);
const cc = (delta, control, value, channel = 0) =>
  event(delta, 0xb0 + channel, control, value);
const tempo = (delta, value) =>
  event(delta, 255, 81, 3, value >> 16, (value >> 8) & 255, value & 255);
const u32 = (value) => [
  (value >>> 24) & 255,
  (value >>> 16) & 255,
  (value >>> 8) & 255,
  value & 255,
];
const file = (tracks, format = tracks.length === 1 ? 0 : 1, division = 480) =>
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
    format,
    tracks.length >> 8,
    tracks.length & 255,
    division >> 8,
    division & 255,
    ...tracks.flatMap((events) => [
      77,
      84,
      114,
      107,
      ...u32(events.length),
      ...events,
    ]),
  ]);
const song = (events) => events_from_midi(file([events]));

test("default tempo, running status, long notes, buffer views and track metadata", () => {
  const bytes = file([
    [
      ...event(0, 255, 3, 4, 84, 101, 115, 116),
      ...event(0, 0xc2, 7),
      ...on(0, 60, 2),
      ...event(9600, 60, 0),
      ...end(480),
    ],
  ]);
  const wrapped = new Uint8Array(bytes.length + 8);
  wrapped.set(bytes, 4);
  const result = events_from_midi(wrapped.subarray(4, bytes.length + 4));
  assert.deepEqual(result.tracks, [
    { index: 0, name: "Test", end_tick: 10080 },
  ]);
  assert.deepEqual(result.notes[0], {
    track: 0,
    channel: 2,
    pitch: 60,
    velocity: 100,
    program: 7,
    start_seconds: 0,
    key_release_seconds: 10,
    end_seconds: 10,
  });
  assert.equal(result.duration_seconds, 10.5);
  assert.deepEqual(result.warnings, []);
  assert.equal(events_from_midi(bytes.buffer).notes[0].end_seconds, 10);
});

test("tempo map merges all tracks and changes tempo after reaching its tick", () => {
  const result = events_from_midi(
    file([
      [...tempo(0, 500000), ...tempo(480, 1000000), ...end(480)],
      [...on(0), ...off(960), ...end()],
      [...tempo(720, 250000), ...end(240)],
    ]),
  );
  assert.equal(result.notes[0].end_seconds, 1.125);
  assert.deepEqual(
    result.tempos.map((x) => [x.tick, x.seconds, x.microseconds_per_quarter]),
    [
      [0, 0, 500000],
      [480, 0.5, 1000000],
      [720, 1, 250000],
    ],
  );
});

test("sustain threshold is 64 and channel state spans tracks without leaking", () => {
  const result = events_from_midi(
    file([
      [...cc(0, 64, 64), ...cc(960, 64, 63), ...end()],
      [...on(0), ...off(480), ...end(480)],
      [...on(0, 60, 1), ...off(480, 60, 1), ...end(480)],
    ]),
  );
  assert.deepEqual(
    result.notes.map((n) => [n.channel, n.key_release_seconds, n.end_seconds]),
    [
      [0, 0.5, 1],
      [1, 0.5, 0.5],
    ],
  );
});

test("overlapping pitches pair FIFO and pedal-held voices survive retriggering", () => {
  const result = song([
    ...cc(0, 64, 127),
    ...on(0),
    ...on(120),
    ...off(120),
    ...on(120),
    ...off(120),
    ...off(120),
    ...cc(120, 64, 0),
    ...end(),
  ]);
  assert.deepEqual(
    result.notes.map((n) => n.start_seconds),
    [0, 0.125, 0.375],
  );
  assert.deepEqual(
    result.notes.map((n) => n.key_release_seconds),
    [0.25, 0.5, 0.625],
  );
  assert.deepEqual(
    result.notes.map((n) => n.end_seconds),
    [0.75, 0.75, 0.75],
  );
});

test("same-tick ordering preserves track order and event order", () => {
  const result = song([
    ...on(0),
    ...off(0),
    ...cc(0, 64, 127),
    ...on(0),
    ...off(0),
    ...cc(480, 64, 0),
    ...end(),
  ]);
  assert.deepEqual(
    result.notes.map((n) => n.end_seconds),
    [0, 0.5],
  );
  const tied = events_from_midi(
    file([
      [...tempo(0, 1000000), ...end(480)],
      [...tempo(0, 250000), ...on(0), ...off(480), ...end()],
    ]),
  );
  assert.equal(tied.duration_seconds, 0.25);
});

test("controller resets, all notes off and all sound off have distinct sustain behavior", () => {
  for (const [controller, expected] of [
    [120, 0.5],
    [121, 0.5],
    [123, 1],
  ]) {
    const result = song([
      ...cc(0, 64, 127),
      ...on(0),
      ...(controller === 121 ? off(240) : []),
      ...cc(controller === 121 ? 240 : 480, controller, 0),
      ...cc(480, 64, 0),
      ...end(),
    ]);
    assert.equal(result.notes[0].end_seconds, expected);
  }
});

test("unfinished notes close at global end and warnings preserve unsupported pitches", () => {
  const result = events_from_midi(
    file([
      [
        ...off(0),
        ...on(0, 12, 9),
        ...on(0, 70),
        ...cc(0, 64, 127),
        ...off(480, 70),
        ...end(),
      ],
      [...end(960)],
    ]),
  );
  assert.deepEqual(
    result.notes.map((n) => n.end_seconds),
    [1, 1],
  );
  assert.deepEqual(result.warnings, [
    { code: "unmatched_note_off", count: 1 },
    { code: "unfinished_notes", count: 2 },
    { code: "piano_pitch_out_of_range", count: 1 },
    { code: "percussion_channel", count: 1 },
  ]);
});

test("unknown metadata, zero-length payloads and SysEx do not corrupt following notes or leak parser hooks", () => {
  const previous = MidiParser.customInterpreter;
  const result = song([
    ...event(0, 255, 127, 1, 125),
    ...event(0, 255, 9, 0),
    ...event(0, 240, 3, 1, 2, 247),
    ...event(0, 247, 0),
    ...on(0),
    ...off(480),
    ...end(),
  ]);
  assert.equal(result.notes.length, 1);
  assert.equal(result.notes[0].end_seconds, 0.5);
  assert.equal(MidiParser.customInterpreter, previous);
});

test("malformed files are rejected before the legacy parser is invoked", () => {
  const valid = file([[...on(0), ...off(480), ...end()]]);
  const chunkShort = valid.slice();
  chunkShort[21]--;
  const chunkLong = valid.slice();
  chunkLong[21]++;
  const malformed = [
    new Uint8Array(),
    new Uint8Array(14),
    valid.slice(0, -1),
    chunkShort,
    chunkLong,
    file([[...on(0), ...off(1)]]),
    file([[...on(0), ...end(), 0]]),
    file([[...event(0, 255, 81, 2, 1, 2), ...end()]]),
    file([[...tempo(0, 0), ...end()]]),
    file([[...event(0, 255, 88, 3, 4, 2, 24), ...end()]]),
    file([[...event(0, 60, 100), ...end()]]),
    file([[...on(0), ...event(0, 255, 3, 0), ...event(0, 60, 0), ...end()]]),
    file([[...on(0, 200), ...end()]]),
    file([[0x81, 0x80, 0x80, 0x80, 0, ...end()]]),
    file([[...event(0, 240, 100, 1), ...end()]]),
    file([[...event(0, 0xf1, 0), ...end()]]),
  ];
  const parse = MidiParser.parse;
  let called = false;
  try {
    MidiParser.parse = () => {
      called = true;
      throw new Error("must not parse");
    };
    for (const bytes of malformed)
      assert.throws(() => events_from_midi(bytes), MidiFileError);
    assert.equal(called, false);
  } finally {
    MidiParser.parse = parse;
  }
});

test("unsupported format, timing, track counts, limits, empty notes and input types", () => {
  for (const bytes of [
    file([end()], 2),
    file([end()], 0, 0xe728),
    file([end()], 0, 0),
    file([], 1),
    file([end(), end()], 0),
  ])
    assert.throws(() => events_from_midi(bytes), MidiFileError);
  assert.throws(
    () => events_from_midi(new Uint8Array(MAX_MIDI_BYTES + 1)),
    /8 MiB/,
  );
  const events = new Uint8Array((MAX_MIDI_EVENTS + 1) * 3);
  for (let index = 0; index < events.length; index += 3)
    events.set([0, 0xc0, 0], index);
  const prefix = file([[]]);
  prefix.set(u32(events.length), 18);
  const oversized = new Uint8Array(prefix.length + events.length);
  oversized.set(prefix);
  oversized.set(events, prefix.length);
  assert.throws(
    () => events_from_midi(oversized),
    /event limit|event-limit|200,000-event/,
  );
  assert.throws(() => song(end()), /no playable/);
  assert.throws(() => events_from_midi("bad"), MidiFileError);
});

test("inconsistent parser results are rejected and hook is restored on failure", () => {
  const parse = MidiParser.parse;
  const hook = MidiParser.customInterpreter;
  try {
    MidiParser.parse = () => {
      throw new Error("failure");
    };
    assert.throws(() => song([...on(0), ...off(1), ...end()]), MidiFileError);
    assert.equal(MidiParser.customInterpreter, hook);
    MidiParser.parse = () => false;
    assert.throws(() => song([...on(0), ...off(1), ...end()]), MidiFileError);
  } finally {
    MidiParser.parse = parse;
  }
});

test("trailing export bytes are isolated from parsing and reported", () => {
  const original = file([[...on(0), ...off(480), ...end()]]);
  const bytes = new Uint8Array([...original, 255, 47, 0, 0, 0, 255, 47, 0]);
  const result = events_from_midi(bytes);
  assert.equal(result.notes[0].end_seconds, 0.5);
  assert.deepEqual(result.warnings, [
    { code: "trailing_bytes_ignored", count: 8 },
  ]);
});
