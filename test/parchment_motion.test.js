import assert from "node:assert/strict";
import test from "node:test";
import { advance_parchment_roll } from "../src/pages/games/ParchmentMotion.js";
import { parchment_string_points } from "../src/pages/games/ParchmentSuspension.js";
import { game_ambient_motion } from "../src/pages/games/GameAmbientMotion.js";

test("shared ambient force has a slow bounded cycle and freezes under reduced motion", () => {
  const quarter = Math.PI / (2 * 0.32);
  const crest = game_ambient_motion(quarter);
  assert.ok(Math.abs(crest.roll_rad - 0.025) < 1e-10);
  assert.ok(Math.abs(crest.lift - 0.035) < 1e-10);
  const trough = game_ambient_motion(quarter * 3);
  assert.ok(Math.abs(trough.roll_rad + crest.roll_rad) < 1e-10);
  assert.ok(Math.abs(trough.lift + crest.lift) < 1e-10);
  assert.deepEqual(game_ambient_motion(quarter, true), {
    roll_rad: 0,
    lift: 0,
  });
});

test("hanging string follows the wooden handles while its nail remains fixed", () => {
  const rest = parchment_string_points(0);
  assert.deepEqual(rest, [
    { x: 10, y: 17 },
    { x: 50, y: 10 },
    { x: 90, y: 17 },
  ]);
  for (const angle of [-120, -60, -15, 15, 60, 120]) {
    const points = parchment_string_points(angle);
    assert.deepEqual(points[1], rest[1]);
    for (const index of [0, 2]) {
      assert.ok(
        Math.abs(
          Math.hypot(points[index].x - 50, points[index].y - 50) -
            Math.hypot(40, 33),
        ) < 1e-9,
      );
    }
    assert.ok(
      Math.abs(
        Math.hypot(points[0].x - points[2].x, points[0].y - points[2].y) - 80,
      ) < 1e-9,
    );
  }
  const quarter = parchment_string_points(90);
  assert.ok(Math.abs(quarter[0].x - 83) < 1e-9);
  assert.ok(Math.abs(quarter[0].y - 10) < 1e-9);
  assert.ok(Math.abs(quarter[2].x - 83) < 1e-9);
  assert.ok(Math.abs(quarter[2].y - 90) < 1e-9);
});

test("parchment lags a roll change and gradually settles at the target", () => {
  const state = { angle: 0, velocity: 0 };
  assert.equal(advance_parchment_roll(state, 30, 1 / 60), false);
  assert.ok(state.angle > 0 && state.angle < 1);
  for (let i = 0; i < 29; i++) advance_parchment_roll(state, 30, 1 / 60);
  assert.ok(state.angle > 5 && state.angle < 20);
  let settled;
  for (let i = 0; i < 300; i++)
    settled = advance_parchment_roll(state, 30, 1 / 60);
  assert.equal(settled, true);
  assert.ok(Math.abs(state.angle - 30) < 1e-9);
  assert.equal(state.velocity, 0);
});

test("spring response is independent of frame rate", () => {
  const slow = { angle: 0, velocity: 0 },
    fast = { ...slow };
  for (let i = 0; i < 30; i++) advance_parchment_roll(slow, -45, 1 / 30);
  for (let i = 0; i < 120; i++) advance_parchment_roll(fast, -45, 1 / 120);
  assert.ok(Math.abs(slow.angle - fast.angle) < 1e-9);
  assert.ok(Math.abs(slow.velocity - fast.velocity) < 1e-9);
});

test("parchment takes the short path across roll wrap and preserves momentum on retarget", () => {
  const state = { angle: 179, velocity: 0 };
  for (let i = 0; i < 60; i++) advance_parchment_roll(state, -179, 1 / 60);
  assert.ok(state.angle > 179 && state.angle < 182);
  const before = { ...state };
  advance_parchment_roll(state, 150, 0);
  assert.ok(Math.abs(state.angle - before.angle) < 1e-10);
  assert.ok(Math.abs(state.velocity - before.velocity) < 1e-10);
});
