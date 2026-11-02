import test from "node:test";
import assert from "node:assert/strict";
import {
  timeline_geometry,
  zoom_scroll,
  ruler_ticks,
  timeline_time,
  index_track_notes,
  visible_track_notes,
  visible_track_rows,
  note_rectangle,
  TRACK_LABEL_WIDTH,
} from "../src/pages/games/music/MidiTrackGeometry.js";

test("fit and logarithmic zoom bound the timeline width even for very long files", () => {
  for (const duration of [0, 0.001, 1.5, 3600, 1e14]) {
    const fit = timeline_geometry(duration, 992);
    assert.equal(fit.width, 800);
    assert.ok(fit.extent >= 800 && fit.extent <= 801);
    const zoomed = timeline_geometry(duration, 992, 100);
    assert.ok(zoomed.extent <= 800 * 256 + 1);
    assert.ok(Number.isFinite(zoomed.scale));
  }
  assert.equal(timeline_geometry(10, 100).width, 1);
  assert.equal(TRACK_LABEL_WIDTH, 192);
});

test("zoom preserves the visible center where possible and clamps at either edge", () => {
  const old = timeline_geometry(100, 992, 1),
    next = timeline_geometry(100, 992, 2);
  const left = zoom_scroll(200, old.scale, next.scale, 800, next.extent);
  assert.equal((left + 400) / next.scale, (200 + 400) / old.scale);
  assert.equal(zoom_scroll(1000, 100, 1, 800, 800), 0);
  assert.equal(zoom_scroll(0, 100, 1, 800, 1600), 0);
});

test("ruler spacing stays legible, viewport-bounded, and correctly formats minute carry", () => {
  const ticks = ruler_ticks(1600, 800, 80, 100);
  assert.ok(ticks.length > 0 && ticks.length < 20);
  assert.ok(ticks.every((t) => t.x >= 0 && t.x <= 800));
  assert.ok(ticks.every((t, i) => !i || t.x - ticks[i - 1].x >= 80));
  assert.equal(timeline_time(59.999, 0.1), "1:00.0");
  assert.equal(timeline_time(60, 1), "1:00");
  assert.equal(timeline_time(0.125, 0.01), "0:00.13");
});

test("interval queries retain long held notes, overlapping notes, and shared note identities", () => {
  const notes = [
    { start_seconds: 0, end_seconds: 100 },
    { start_seconds: 1, end_seconds: 2 },
    { start_seconds: 30, end_seconds: 40 },
    { start_seconds: 35, end_seconds: 35 },
  ];
  const index = index_track_notes(notes);
  assert.deepEqual(visible_track_notes(index, 34, 36), [
    notes[0],
    notes[2],
    notes[3],
  ]);
  assert.deepEqual(visible_track_notes(index, 50, 60), [notes[0]]);
  assert.deepEqual(visible_track_notes(index, 101, 102), []);
  assert.deepEqual(visible_track_notes(null, 0, 1), []);
});

test("track virtualization keeps row counts bounded with overscan and fixed label alignment", () => {
  const first = visible_track_rows(0, 400, 256);
  const late = visible_track_rows(10000, 400, 256);
  assert.equal(first.first, 0);
  assert.ok(late.first > 100);
  assert.ok(late.last - late.first <= 9);
  assert.deepEqual(visible_track_rows(0, 400, 2), { first: 0, last: 2 });
});

test("note rectangles clip to the viewport and zero-duration notes remain visible", () => {
  const range = { min: 60, max: 72 };
  assert.deepEqual(
    note_rectangle(
      { start_seconds: 0, end_seconds: 10, pitch: 72 },
      10,
      50,
      40,
      range,
    ),
    { x: 0, width: 40, y: 8, height: 6 },
  );
  const zero = note_rectangle(
    { start_seconds: 5, end_seconds: 5, pitch: 60 },
    10,
    40,
    100,
    range,
  );
  assert.equal(zero.width, 2);
  assert.equal(zero.y, 57);
  assert.equal(
    note_rectangle(
      { start_seconds: 0, end_seconds: 0, pitch: 60 },
      10,
      0,
      100,
      { min: 60, max: 60 },
    ).y,
    36,
  );
});

test("large interval index returns only notes overlapping a narrow viewport", () => {
  const notes = Array.from({ length: 100000 }, (_, index) => ({
    start_seconds: index,
    end_seconds: index + 0.5,
  }));
  const index = index_track_notes(notes);
  const result = visible_track_notes(index, 75000, 75001);
  assert.deepEqual(result, [notes[75000], notes[75001]]);
});
