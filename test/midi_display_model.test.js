import test from "node:test";
import assert from "node:assert/strict";
import { events_from_midi } from "../src/pages/games/music/MidiEvents.js";
import { build_midi_display_model } from "../src/pages/games/music/MidiDisplayModel.js";

const vlq = (n) => {
  const values = [n & 127];
  while ((n >>>= 7)) values.unshift((n & 127) | 128);
  return values;
};
const e = (delta, ...bytes) => [...vlq(delta), ...bytes];
const end = (delta = 0) => e(delta, 255, 47, 0);
const on = (delta, pitch = 60, channel = 0) =>
  e(delta, 0x90 + channel, pitch, 100);
const off = (delta, pitch = 60, channel = 0) =>
  e(delta, 0x80 + channel, pitch, 0);
const text = (type, value) =>
  e(0, 255, type, value.length, ...Array.from(value, (c) => c.charCodeAt(0)));
const tempo = (delta, value) =>
  e(delta, 255, 81, 3, value >> 16, (value >> 8) & 255, value & 255);
const cc = (delta, control, value, channel = 0) =>
  e(delta, 0xb0 + channel, control, value);
const file = (tracks) =>
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
    tracks.length === 1 ? 0 : 1,
    0,
    tracks.length,
    1,
    224,
    ...tracks.flatMap((bytes) => [
      77,
      84,
      114,
      107,
      0,
      (bytes.length >>> 16) & 255,
      (bytes.length >>> 8) & 255,
      bytes.length & 255,
      ...bytes,
    ]),
  ]);

test("display events share the note tempo map and preserve names, provenance and tick releases", () => {
  const bytes = file([
    [
      ...text(3, "Conductor"),
      ...tempo(0, 500000),
      ...tempo(480, 1000000),
      ...e(0, 255, 88, 4, 3, 2, 24, 8),
      ...end(480),
    ],
    [
      ...text(3, "Keys"),
      ...text(4, "Grand"),
      ...e(0, 0xc2, 7),
      ...cc(0, 64, 64, 2),
      ...on(0, 60, 2),
      ...off(480, 60, 2),
      ...e(240, 0xc2, 9),
      ...cc(240, 64, 0, 2),
      ...end(),
    ],
  ]);
  const song = events_from_midi(bytes);
  assert.equal(song.tracks[1].name, "Keys");
  assert.equal(song.tracks[1].instrument_name, "Grand");
  assert.deepEqual(song.instrument_names[0], {
    id: "track:1:event:1",
    track: 1,
    event_index: 1,
    channel: null,
    tick: 0,
    seconds: 0,
    name: "Grand",
  });
  assert.deepEqual(
    song.program_changes.map((p) => [
      p.track,
      p.channel,
      p.program,
      p.tick,
      p.seconds,
    ]),
    [
      [1, 2, 7, 0, 0],
      [1, 2, 9, 720, 1],
    ],
  );
  assert.deepEqual(
    song.pedal_events.map((p) => [p.channel, p.down, p.tick, p.seconds]),
    [
      [2, true, 0, 0],
      [2, false, 960, 1.5],
    ],
  );
  assert.deepEqual(
    song.time_signatures.map((m) => [
      m.numerator,
      m.denominator,
      m.tick,
      m.seconds,
      m.inferred,
    ]),
    [
      [4, 4, 0, 0, true],
      [3, 4, 480, 0.5, false],
    ],
  );
  const note = song.notes[0];
  assert.deepEqual(
    [note.start_tick, note.key_release_tick, note.end_tick],
    [0, 480, 960],
  );
  assert.deepEqual(
    [note.start_seconds, note.key_release_seconds, note.end_seconds],
    [0, 0.5, 1.5],
  );
  assert.equal(note.program, 7);
  assert.equal(note.id, "note:1:4");
  assert.deepEqual(
    events_from_midi(bytes).notes.map((n) => n.id),
    song.notes.map((n) => n.id),
  );
});

test("inferred defaults cover files without tempo/meter and explicit zero-tick events replace them", () => {
  const song = events_from_midi(file([[...on(0), ...off(480), ...end()]]));
  assert.equal(song.tempos[0].inferred, true);
  assert.equal(song.tempos[0].microseconds_per_quarter, 500000);
  assert.equal(song.tempos[0].track, null);
  assert.equal(song.time_signatures[0].inferred, true);
  assert.equal(song.notes[0].end_seconds, 0.5);
  const explicit = events_from_midi(
    file([
      [
        ...tempo(0, 600000),
        ...e(0, 255, 88, 4, 6, 3, 36, 8),
        ...on(0),
        ...off(480),
        ...end(),
      ],
    ]),
  );
  assert.equal(explicit.tempos.length, 1);
  assert.equal(explicit.tempos[0].inferred, false);
  assert.equal(explicit.time_signatures.length, 1);
  assert.equal(explicit.time_signatures[0].denominator, 8);
  assert.equal(explicit.time_signatures[0].inferred, false);
});

test("format 0 mixed channels yield independent routes and an immutable, shared-note display model", () => {
  const song = events_from_midi(
    file([
      [
        ...on(0, 60, 0),
        ...on(0, 72, 2),
        ...off(480, 60, 0),
        ...off(0, 72, 2),
        ...end(),
      ],
    ]),
  );
  const display = build_midi_display_model(song);
  assert.equal(display.rows.length, 1);
  assert.deepEqual(display.rows[0].channels, [0, 2]);
  assert.equal(display.rows[0].note_count, 2);
  assert.deepEqual(display.rows[0].pitch_range, { min: 60, max: 72 });
  assert.deepEqual(
    display.rows[0].routes.map((r) => r.id),
    ["track:0:channel:0", "track:0:channel:2"],
  );
  assert.equal(display.rows[0].routes[0].notes[0], song.notes[0]);
  assert.equal(display.tempos, song.tempos);
  assert.ok(
    Object.isFrozen(song) &&
      Object.isFrozen(song.notes) &&
      Object.isFrozen(song.notes[0]),
  );
  assert.ok(Object.isFrozen(display.rows[0].routes[0].notes));
  assert.throws(() => {
    song.notes[0].pitch = 99;
  }, TypeError);
});

test("shared channels retain channel-wide state while grouping notes by origin track", () => {
  const song = events_from_midi(
    file([
      [...e(0, 0xc0, 12), ...cc(0, 64, 127), ...cc(960, 64, 0), ...end()],
      [...on(0, 60), ...off(480, 60), ...end(480)],
      [...on(0, 67), ...off(480, 67), ...end(480)],
      [...end(960)],
    ]),
  );
  const display = build_midi_display_model(song);
  assert.deepEqual(
    display.rows.map((t) => t.index),
    [1, 2],
  );
  assert.deepEqual(
    display.conductor_tracks.map((t) => t.index),
    [0, 3],
  );
  assert.deepEqual(display.conductor_tracks[0].pitch_range, null);
  assert.deepEqual(
    display.rows.map((t) => t.programs),
    [[12], [12]],
  );
  assert.deepEqual(
    song.notes.map((n) => [n.program, n.key_release_tick, n.end_tick]),
    [
      [12, 480, 960],
      [12, 480, 960],
    ],
  );
  assert.notEqual(display.rows[0].routes[0].id, display.rows[1].routes[0].id);
});

test("controller history includes bank/mix data and Reset Controllers releases only its channel pedal", () => {
  const song = events_from_midi(
    file([
      [
        ...cc(0, 0, 2),
        ...cc(0, 32, 4),
        ...cc(0, 7, 90),
        ...cc(0, 10, 32),
        ...cc(0, 11, 80),
        ...cc(0, 64, 127),
        ...cc(0, 64, 127, 1),
        ...on(0),
        ...on(0, 65, 1),
        ...off(240),
        ...off(0, 65, 1),
        ...cc(240, 121, 0),
        ...cc(480, 64, 0, 1),
        ...end(),
      ],
    ]),
  );
  assert.deepEqual(
    song.controller_events.slice(0, 5).map((c) => [c.controller, c.value]),
    [
      [0, 2],
      [32, 4],
      [7, 90],
      [10, 32],
      [11, 80],
    ],
  );
  assert.deepEqual(
    song.notes.map((n) => n.end_seconds),
    [0.5, 1],
  );
  const reset = song.pedal_events.find((p) => p.controller === 121);
  assert.equal(reset.inferred, true);
  assert.equal(reset.down, false);
  assert.equal(reset.tick, 480);
  assert.equal(reset.channel, 0);
});

test("program/name histories and repeated pitches retain distinct stable identities", () => {
  const song = events_from_midi(
    file([
      [
        ...text(3, "Original"),
        ...text(4, "Piano"),
        ...on(0),
        ...on(0),
        ...off(120),
        ...off(120),
        ...e(0, 0xc0, 40),
        ...text(4, "Strings"),
        ...on(0, 62),
        ...off(240, 62),
        ...end(),
      ],
    ]),
  );
  const display = build_midi_display_model(song);
  assert.equal(new Set(song.notes.map((n) => n.id)).size, 3);
  assert.deepEqual(display.rows[0].programs, [0, 40]);
  assert.deepEqual(
    song.instrument_names.map((n) => n.name),
    ["Piano", "Strings"],
  );
  assert.equal(song.track_names[0].name, "Original");
  assert.equal(song.tracks[0].instrument_name, "Strings");
});

test("all-sound-off and unfinished notes have matching tick and second endpoints", () => {
  const song = events_from_midi(
    file([[...on(0), ...cc(240, 120, 0), ...on(0, 65), ...end(720)]]),
  );
  assert.deepEqual(
    song.notes.map((n) => [n.key_release_tick, n.end_tick, n.end_seconds]),
    [
      [240, 240, 0.25],
      [960, 960, 1],
    ],
  );
});
