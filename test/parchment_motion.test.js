import assert from "node:assert/strict";
import test from "node:test";
import { advance_parchment_roll } from "../src/pages/games/ParchmentMotion.js";

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
