import assert from "node:assert/strict";
import test from "node:test";
import { Vector3, PerspectiveCamera } from "three";
import { inventory_camera_position } from "../src/pages/games/InventoryCamera.js";
function check(size, aspect, reference) {
  const target = new Vector3(size.x <= 2 ? 0.3 : 0, size.y / 2, 0);
  const camera = new PerspectiveCamera(38, aspect, 0.01, 1000000);
  camera.position.copy(
    inventory_camera_position(size, target, aspect, 38, reference),
  );
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  const include = (x, y, z) => {
    const p = new Vector3(x, y, z).project(camera);
    assert.ok(
      Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && p.z < 1 && p.z > -1,
      JSON.stringify(p),
    );
  };
  for (const x of [-size.x / 2, size.x / 2])
    for (const y of [0, size.y])
      for (const z of [-size.z / 2, size.z / 2]) include(x, y, z);
  if (reference)
    for (const x of [0.85, 1.85])
      for (const y of [0, 1]) for (const z of [-0.5, 0.5]) include(x, y, z);
  return camera.position.distanceTo(target);
}
test("projected framing fits flat imported grass tightly", () => {
  assert.ok(check(new Vector3(673, 46.74, 697), 1.5, true) < 1300);
});
test("framing keeps small assets and meter references visible on wide and narrow previews", () => {
  for (const aspect of [0.5, 1, 2]) check(new Vector3(1, 1, 1), aspect, true);
  check(new Vector3(10, 0.38, 10), 1.5, false);
});
