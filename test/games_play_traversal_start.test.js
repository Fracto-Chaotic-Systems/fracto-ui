import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { create_path_motion_controller } from "@fracto/sdk/FractoPathMotion.js";
import {
  select_play_traversal_start,
  random_play_traversal_start,
  play_traversal_start_seconds,
} from "../src/pages/games/GamesPlayTraversalStart.js";
const path = JSON.parse(
  readFileSync(
    new URL("../public/motions/slow-strip-patrol.json", import.meta.url),
  ),
);

test("new starts cover the strip interior and differ from the preceding visible stretch", () => {
  for (const previous of [null, 0.1, 0.3, 0.5, 0.8, 0.9]) {
    for (const draw of [0, 0.1, 0.5, 0.9, 1]) {
      const next = select_play_traversal_start(previous, () => draw);
      assert.ok(next >= 0.1 - 1e-12 && next <= 0.9 + 1e-12);
      if (previous !== null)
        assert.ok(Math.abs(next - previous) >= 0.1 - 1e-12);
      const motion = create_path_motion_controller(path);
      const pose = motion.reset(play_traversal_start_seconds(motion, next));
      assert.equal(pose.phase, "travel");
      assert.equal(
        pose.direction,
        1,
        "Insects must still traverse downward at their entrance",
      );
      assert.equal(pose.speed_mps, path.speed_mps);
      assert.ok(Math.abs(pose.distance_m - 18.9 * next) < 1e-8);
      assert.ok(Math.abs(pose.position[2]) <= 7.56 + 1e-8);
      assert.equal(
        motion.sample(motion.travel_seconds + path.pause_seconds + 1).phase,
        "turn",
      );
    }
  }
});

test("session storage carries the preceding starting point through a browser reload", () => {
  let saved = "0.5";
  const storage = {
    getItem: () => saved,
    setItem: (_, value) => {
      saved = value;
    },
  };
  const first = random_play_traversal_start({ storage, random: () => 0.5 });
  assert.equal(Number(saved), first);
  const reloaded = random_play_traversal_start({ storage, random: () => 0.5 });
  assert.ok(Math.abs(reloaded - first) >= 0.1 - 1e-12);
  assert.equal(Number(saved), reloaded);
  const blocked = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  assert.doesNotThrow(() => random_play_traversal_start({ storage: blocked }));
});

test("invalid offsets cannot initialize the path", () => {
  const motion = create_path_motion_controller(path);
  for (const value of [-1, 2, NaN])
    assert.throws(() => play_traversal_start_seconds(motion, value));
});
