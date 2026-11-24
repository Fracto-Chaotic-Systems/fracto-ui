import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  WALK_SETTINGS,
  create_floor_probe,
  look_walk,
  step_walk,
  walk_spawn,
} from "../src/pages/games/ComponentStageWalk.js";

const idle = { forward: 0, right: 0, up: 0, run: false, jump: false };
const start = (yaw = 0) => ({
  position: [0, WALK_SETTINGS.eye_height, 0],
  yaw,
  pitch: 0,
  velocity_y: 0,
  flying: false,
});
const flat = () => 0;
const close = (actual, expected) =>
  actual.forEach((value, i) =>
    assert.ok(Math.abs(value - expected[i]) < 1e-9, `${actual} ≠ ${expected}`),
  );

test("walking moves along the view direction at walking and running speed", () => {
  close(
    step_walk(start(), { ...idle, forward: 1 }, 1, flat).position,
    [0, 1.7, -1.4],
  );
  close(
    step_walk(start(Math.PI / 2), { ...idle, forward: 1 }, 1, flat).position,
    [-1.4, 1.7, 0],
  );
  close(
    step_walk(start(), { ...idle, right: 1, run: true }, 1, flat).position,
    [4.2, 1.7, 0],
  );
  const diagonal = step_walk(
    start(),
    { ...idle, forward: 1, right: 1 },
    1,
    flat,
  ).position;
  assert.ok(Math.abs(Math.hypot(diagonal[0], diagonal[2]) - 1.4) < 1e-9);
});

test("eye height follows the floor and a jump returns to it", () => {
  assert.equal(
    step_walk(start(), idle, 0.016, () => 0.25).position[1],
    0.25 + 1.7,
  );
  let state = step_walk(start(), { ...idle, jump: true }, 0.016, flat);
  let peak = state.position[1];
  for (let i = 0; i < 200; i += 1) {
    state = step_walk(state, idle, 0.016, flat);
    peak = Math.max(peak, state.position[1]);
  }
  assert.ok(peak - 1.7 > 0.5 && peak - 1.7 < 0.7);
  assert.equal(state.position[1], 1.7);
  assert.equal(state.velocity_y, 0);
});

test("missing floor is treated as ground level; flying ignores gravity but keeps clearance", () => {
  assert.equal(step_walk(start(), idle, 0.5, () => null).position[1], 1.7);
  const flying = { ...start(), flying: true };
  assert.equal(
    step_walk(flying, { ...idle, up: 1 }, 1, flat).position[1],
    1.7 + 4,
  );
  assert.equal(
    step_walk(flying, { ...idle, up: -1 }, 10, flat).position[1],
    0.3,
  );
});

test("looking clamps pitch and turns yaw", () => {
  const looked = look_walk(start(), 100, -100000);
  assert.ok(
    Math.abs(looked.yaw + 100 * WALK_SETTINGS.look_sensitivity) < 1e-12,
  );
  assert.equal(looked.pitch, WALK_SETTINGS.max_pitch);
});

test("spawn stands inside the construction edge facing its centre", () => {
  const spawn = walk_spawn([0, 0, 0], 10, [40, 30, 0]);
  close(spawn.position, [9, 1.7, 0]);
  const facing = step_walk(spawn, { ...idle, forward: 1 }, 1, flat).position;
  assert.ok(facing[0] < 9);
  close(walk_spawn([0, 0, 0], 10, [0, 50, 0]).position, [0, 1.7, 0.5]);
});

test("floor probe reads only the authored floor mesh", () => {
  const root = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.005;
  floor.userData.component_item_id = "floor";
  const rock = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
  rock.userData.component_item_id = "rock";
  root.add(floor, rock);
  root.updateMatrixWorld(true);
  const probe = create_floor_probe(root);
  assert.ok(Math.abs(probe(0, 0) + 0.005) < 1e-9);
  assert.equal(probe(50, 0), null);
  assert.equal(create_floor_probe(new THREE.Group())(0, 0), null);
  let current = new THREE.Group();
  const live = create_floor_probe(() => current);
  assert.equal(live(0, 0), null);
  current = root;
  assert.ok(Math.abs(live(0, 0) + 0.005) < 1e-9);
});
