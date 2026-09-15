import test from "node:test";
import assert from "node:assert/strict";
import {
  append_snapshot,
  clone_video,
  move_position,
} from "../src/pages/assets/video/VideoEditHistoryUtils.js";

const video = (value) => ({
  id: 1,
  meta: { description: `video-${value}` },
  script: { steps: [{ scope: value }] },
});

test("history snapshots are deeply immutable", () => {
  const snapshot = clone_video(video(1));
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.meta));
  assert.ok(Object.isFrozen(snapshot.script.steps[0]));
});

test("append_snapshot ignores no-op edits", () => {
  const initial = clone_video(video(1));
  const result = append_snapshot([initial], 0, video(1));
  assert.equal(result.changed, false);
  assert.equal(result.history.length, 1);
  assert.equal(result.position, 0);
});

test("append_snapshot branches by discarding redo states", () => {
  const first = append_snapshot([], -1, video(1));
  const second = append_snapshot(first.history, first.position, video(2));
  const traversed = move_position(second.history, second.position, -1);
  const branched = append_snapshot(second.history, traversed, video(3));
  assert.deepEqual(
    branched.history.map((item) => item.meta.description),
    ["video-1", "video-3"],
  );
  assert.equal(branched.position, 1);
});

test("append_snapshot enforces the history limit", () => {
  let result = { history: [], position: -1 };
  for (let value = 0; value < 4; value++) {
    result = append_snapshot(result.history, result.position, video(value), 2);
  }
  assert.equal(result.history.length, 2);
  assert.deepEqual(
    result.history.map((item) => item.meta.description),
    ["video-2", "video-3"],
  );
});

test("move_position clamps traversal at both ends", () => {
  const history = [video(1), video(2), video(3)];
  assert.equal(move_position(history, 0, -1), 0);
  assert.equal(move_position(history, 2, 1), 2);
  assert.equal(move_position(history, 1, -1), 0);
  assert.equal(move_position(history, 1, 1), 2);
});
