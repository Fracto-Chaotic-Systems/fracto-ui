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

test("powered flight preloads up to two upcoming patches above or below the terrain", () => {
  const camera = camera_at(0.5);
  assert.deepEqual(nearby_refinements(plan, camera, 1000), []);
  const selected = nearby_refinements(
    plan,
    camera,
    1000,
    new Set(),
    new Set(),
    { speed: 0.2 },
  );
  assert.ok(selected.length > 0 && selected.length <= 2);
  assert.deepEqual(
    nearby_refinements(plan, camera, 1000, new Set(), new Set(), { speed: 0 }),
    [],
  );
  assert.deepEqual(
    nearby_refinements(plan, camera, 1000, new Set(), new Set(), {
      speed: Infinity,
    }),
    [],
  );
  const below = camera_at(-0.5);
  const underside = nearby_refinements(
    plan,
    below,
    1000,
    new Set(),
    new Set(),
    { speed: 0.2 },
  );
  assert.ok(underside.length > 0 && underside.length <= 2);
  assert.deepEqual(
    nearby_refinements(plan, camera_at(2, 2), 1000, new Set(), new Set(), {
      speed: 0.2,
    }),
    [],
  );
});

test("lookahead follows heading, respects blocked availability and preserves the eight-patch budget", () => {
  const group = (id, z) => ({
    id,
    bounds: { left: -0.05, right: 0.05, top: -(z - 0.05), bottom: -(z + 0.05) },
    children: [],
  });
  const directional = {
    ...plan,
    refinements: [
      group("ahead", -0.15),
      group("behind", 0.8),
      group("visible", 0.22),
    ],
  };
  const camera = new THREE.PerspectiveCamera(45, 1, 0.001, 100);
  camera.position.set(0, 0.08, 0.5);
  camera.lookAt(0, 0.08, 0);
  const idle = nearby_refinements(directional, camera, 1000);
  assert.ok(idle.includes("visible"));
  assert.ok(!idle.includes("ahead"));
  const flying = nearby_refinements(
    directional,
    camera,
    1000,
    new Set(),
    new Set(),
    { speed: 0.2 },
  );
  assert.ok(flying.includes("visible"));
  assert.ok(flying.includes("ahead"));
  assert.ok(!flying.includes("behind"));
  assert.ok(
    !nearby_refinements(
      directional,
      camera,
      1000,
      new Set(),
      new Set(["ahead"]),
      { speed: 0.2 },
    ).includes("ahead"),
  );
  camera.lookAt(0, 0.08, 1);
  const reversed = nearby_refinements(
    directional,
    camera,
    1000,
    new Set(),
    new Set(),
    { speed: 0.2 },
  );
  assert.ok(reversed.includes("behind"));
  assert.ok(!reversed.includes("ahead"));
  const busy = {
    ...plan,
    refinements: Array.from({ length: 20 }, (_, i) =>
      group(String(i), 0.2 - i * 0.04),
    ),
  };
  camera.lookAt(0, 0.08, 0);
  assert.ok(
    nearby_refinements(busy, camera, 1000, new Set(), new Set(), { speed: 0.2 })
      .length <= 8,
  );
});

test("motion changes during loading queue the latest layout without overlapping requests", async () => {
  const camera = camera_at(0.5),
    requests = [];
  let motion = { speed: 0.2 };
  const lod = new SimulatorTerrainLod({
    camera,
    viewport_height: () => 1000,
    motion: () => motion,
    on_change: (request) =>
      new Promise((resolve) => requests.push({ request, resolve })),
  });
  try {
    lod.set_plan(plan);
    const first = lod.update();
    assert.equal(requests.length, 1);
    assert.ok(requests[0].request.requested_refinements.length > 0);
    camera.lookAt(10, 10, 10);
    motion = null;
    await lod.update();
    assert.equal(requests.length, 1);
    requests[0].resolve({
      refined_groups: requests[0].request.requested_refinements,
    });
    await first;
    const second = lod.update();
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[1].request.requested_refinements, []);
    requests[1].resolve({ refined_groups: [] });
    await second;
    assert.equal(lod.current.size, 0);
  } finally {
    lod.dispose();
  }
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
