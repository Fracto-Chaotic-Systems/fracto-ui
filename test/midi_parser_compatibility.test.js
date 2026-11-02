import test from "node:test";
import assert from "node:assert/strict";
import MidiParser from "midi-parser-js";

const midi_file = (tracks, format = 0, division = 480) =>
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
    0,
    tracks.length,
    division >> 8,
    division & 255,
    ...tracks.flatMap((events) => [
      77,
      84,
      114,
      107,
      (events.length >>> 24) & 255,
      (events.length >>> 16) & 255,
      (events.length >>> 8) & 255,
      events.length & 255,
      ...events,
    ]),
  ]);
const end = [0, 255, 47, 0];

test("legacy parser preserves PPQ, tempo, channel, running status and controllers", () => {
  const result = MidiParser.parse(
    midi_file([
      [
        0,
        255,
        81,
        3,
        7,
        161,
        32,
        0,
        0x92,
        60,
        100,
        0,
        64,
        80,
        0x83,
        0x60,
        60,
        0,
        0,
        0xb2,
        64,
        64,
        ...end,
      ],
    ]),
  );
  assert.equal(result.formatType, 0);
  assert.equal(result.timeDivision, 480);
  assert.equal(result.track[0].event[0].data, 500000);
  assert.deepEqual(result.track[0].event[2], {
    deltaTime: 0,
    type: 9,
    channel: 2,
    data: [64, 80],
  });
  assert.deepEqual(result.track[0].event[3], {
    deltaTime: 480,
    type: 9,
    channel: 2,
    data: [60, 0],
  });
  assert.deepEqual(result.track[0].event[4].data, [64, 64]);
});

test("legacy parser preserves format 1 tracks and exposes SMPTE as an array", () => {
  const result = MidiParser.parse(midi_file([end, end], 1));
  assert.equal(result.formatType, 1);
  assert.equal(result.tracks, 2);
  assert.equal(result.track.length, 2);
  // This representation is not PPQ and must be rejected by the future adapter.
  assert.deepEqual(
    MidiParser.parse(midi_file([end], 0, 0xe728)).timeDivision,
    [103, 40],
  );
});

test("custom interpreter avoids the parser's double-read of unknown metadata", () => {
  const previous = MidiParser.customInterpreter;
  try {
    MidiParser.customInterpreter = (_type, file, length) => {
      if (length === false) return false;
      return Array.from({ length }, () => file.readInt(1));
    };
    const result = MidiParser.parse(
      midi_file([[0, 255, 0x7f, 1, 125, 0, 0x90, 60, 100, ...end]]),
    );
    assert.deepEqual(result.track[0].event[0].data, [125]);
    assert.deepEqual(result.track[0].event[1], {
      deltaTime: 0,
      type: 9,
      channel: 0,
      data: [60, 100],
    });
    assert.equal(result.track[0].event[2].metaType, 47);
  } finally {
    MidiParser.customInterpreter = previous;
  }
});
