import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  create_grass_density,
  normalize_grass_density,
} from "../src/pages/games/InventoryGrassDensity.js";

function fixture() {
  const root = new THREE.Group();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial(),
  );
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);
  const geometry = new THREE.ConeGeometry(0.1, 0.8, 4),
    material = new THREE.MeshStandardMaterial({ color: "green" });
  const originals = [-2, 2].map((x) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, 0.4, x);
    root.add(mesh);
    return mesh;
  });
  root.updateMatrixWorld(true);
  return { root, ground, originals, geometry, material };
}
const matrix = (mesh, index) => {
  const value = new THREE.Matrix4();
  mesh.getMatrixAt(index, value);
  return value.toArray();
};

test("1× preserves existing grass placements and shares its geometry/material without changing the ground", () => {
  const { root, ground, originals, geometry, material } = fixture();
  const placements = originals.map((node) => node.matrixWorld.toArray());
  const vertices = [...geometry.attributes.position.array];
  const density = create_grass_density(root);
  assert.equal(density.base_count, 2);
  assert.deepEqual(density.set(1), { count: 2, triangle_delta: 0 });
  placements.forEach((values, index) =>
    assert.deepEqual(matrix(density.mesh, index), values.map(Math.fround)),
  );
  assert.equal(density.mesh.geometry, geometry);
  assert.equal(density.mesh.material, material);
  assert.deepEqual([...geometry.attributes.position.array], vertices);
  assert.ok(originals.every((node) => !node.visible));
  assert.equal(ground.visible, true);
  assert.deepEqual(
    originals.map((node) => node.matrixWorld.toArray()),
    placements,
  );
  density.mesh.dispose();
});

test("fuller density adds stable instances within the field, with correct triangle counts", () => {
  const { root, ground, geometry } = fixture();
  const density = create_grass_density(root);
  const result = density.set(4);
  assert.equal(result.count, 8);
  assert.equal(result.triangle_delta, (6 * geometry.index.count) / 3);
  const placements = Array.from({ length: 8 }, (_, i) =>
    matrix(density.mesh, i),
  );
  for (const values of placements.slice(2)) {
    assert.ok(values[12] >= -5 && values[12] <= 5);
    assert.ok(values[14] >= -5 && values[14] <= 5);
    assert.equal(values[13], Math.fround(0.4));
  }
  density.set(1);
  density.set(4);
  assert.deepEqual(
    Array.from({ length: 8 }, (_, i) => matrix(density.mesh, i)),
    placements,
  );
  assert.equal(ground.visible, true);
  const second = create_grass_density(fixture().root);
  second.set(4);
  assert.deepEqual(
    Array.from({ length: 8 }, (_, i) => matrix(second.mesh, i)),
    placements,
  );
  density.mesh.dispose();
  second.mesh.dispose();
});

test("zero removes only preview grass, input is bounded, and unrelated models are unchanged", () => {
  const { root, ground } = fixture(),
    density = create_grass_density(root);
  assert.equal(density.set(0).count, 0);
  assert.equal(ground.visible, true);
  assert.equal(density.set(100).count, 16);
  assert.equal(density.set(-1).count, 0);
  assert.equal(density.set(NaN).count, 2);
  assert.equal(normalize_grass_density(1.25), 1.25);
  const single = new THREE.Group();
  single.add(
    new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()),
  );
  assert.equal(create_grass_density(single), null);
  assert.equal(single.children[0].visible, true);
  density.mesh.dispose();
});
