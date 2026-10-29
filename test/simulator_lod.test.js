import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import SimulatorTerrainLod, {
  nearby_refinements,
} from "../src/pages/assets/SimulatorTerrainLod.js";

const region = {
  focal_point: { x: 0, y: 0 },
  scope: 1,
  aspect_ratio: 1,
  bounds: { left: -0.5, right: 0.5, top: 0.5, bottom: -0.5 },
};
const groups = Array.from({ length: 9 }, (_, i) => ({
  id: String(i),
  parent_short_code: String(i),
  bounds: {
    left: ((i % 3) - 1.5) * 0.1,
    right: ((i % 3) - 0.5) * 0.1,
    bottom: (Math.floor(i / 3) - 1.5) * 0.1,
    top: (Math.floor(i / 3) - 0.5) * 0.1,
  },
  children: [],
}));
const plan = { level: 4, region, tiles: [], refinements: groups };
const camera_at = (height, z = 0.0001) => {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.001, 100);
  camera.position.set(0, height, z);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return camera;
};

test("local detail chooses at most eight visible nearby patches and disappears at altitude", () => {
  const camera = camera_at(0.12, 0.12),
    selected = nearby_refinements(plan, camera, 1000);
  assert.ok(selected.length > 0 && selected.length <= 8);
  assert.deepEqual(nearby_refinements(plan, camera_at(2, 2), 1000), []);
  camera.lookAt(10, 10, 10);
  assert.deepEqual(nearby_refinements(plan, camera, 1000), []);
});
test("hysteresis retains detail until a larger camera distance", () => {
  const one = { ...plan, refinements: [groups[4]] },
    camera = camera_at(0.5);
  assert.deepEqual(nearby_refinements(one, camera, 1000), []);
  assert.deepEqual(nearby_refinements(one, camera, 1000, new Set(["4"])), [
    "4",
  ]);
  assert.deepEqual(
    nearby_refinements(one, camera_at(0.9), 1000, new Set(["4"])),
    [],
  );
});
test("failed quartets are not retried continuously and reset ignores stale detail responses", async () => {
  const requests = [],
    camera = camera_at(0.12, 0.12);
  const lod = new SimulatorTerrainLod({
    camera,
    viewport_height: () => 1000,
    on_change: (request) =>
      new Promise((resolve) => requests.push({ request, resolve })),
  });
  const one = { ...plan, refinements: [groups[4]] };
  lod.set_plan(one);
  const first = lod.update();
  assert.equal(requests.length, 1);
  requests[0].resolve({ refined_groups: [] });
  await first;
  await lod.update();
  assert.equal(requests.length, 1);
  lod.set_plan(one);
  const second = lod.update();
  lod.reset();
  requests[1].resolve({ refined_groups: ["4"] });
  await second;
  assert.equal(lod.current.size, 0);
  assert.equal(lod.plan, null);
  lod.dispose();
});
