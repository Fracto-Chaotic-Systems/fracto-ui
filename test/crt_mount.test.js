import test from "node:test";
import assert from "node:assert/strict";
import { Object3D, Scene, Vector3 } from "three";
import { pose_crt } from "../src/pages/games/CrtMotion.js";
import { create_tube_geometry } from "../src/pages/games/CrtModel.js";
import {
  create_crt_cables,
  crt_cable_curve,
  update_crt_cables,
} from "../src/pages/games/CrtCables.js";

test("cables keep ceiling and rear socket connections with slack below the TV", () => {
  const scene = new Scene(),
    head = new Object3D();
  scene.add(head);
  const cables = create_crt_cables(scene, head);
  const buffers = cables.map((cable) =>
    cable.mesh.geometry.getAttribute("position"),
  );
  for (const extension of [0, 0.5, 1]) {
    head.position.set(
      -0.28 + extension * 0.32,
      0.99 - extension * 0.2,
      -0.08 + extension * 0.6,
    );
    head.rotation.set(-0.15, 0.85, -0.08);
    update_crt_cables(cables, head, extension + 1, extension, false);
    cables.forEach((cable, index) => {
      const curve = crt_cable_curve(head, cable, extension, cable.sway);
      assert.ok(curve.getPoint(0).distanceTo(cable.anchor) < 1e-10);
      const end = cable.port
        .clone()
        .applyQuaternion(head.quaternion)
        .add(head.position);
      assert.ok(curve.getPoint(1).distanceTo(end) < 1e-10);
      assert.ok(
        Math.min(...curve.getPoints(100).map((point) => point.y)) <
          head.position.y - 0.9,
      );
      assert.equal(
        cable.mesh.geometry.getAttribute("position"),
        buffers[index],
      );
      assert.ok([...buffers[index].array].every(Number.isFinite));
      const indices = cable.mesh.geometry.index.array;
      const normals = cable.mesh.geometry.getAttribute("normal");
      const a = new Vector3().fromBufferAttribute(buffers[index], indices[600]);
      const b = new Vector3().fromBufferAttribute(buffers[index], indices[601]);
      const c = new Vector3().fromBufferAttribute(buffers[index], indices[602]);
      const normal = new Vector3().fromBufferAttribute(normals, indices[600]);
      assert.ok(
        b.sub(a).cross(c.sub(a)).dot(normal) > 0,
        "cable faces point outward",
      );
    });
  }
  update_crt_cables(cables, head, 3, 1, true);
  assert.ok(cables.every((cable) => cable.sway === 0));
});

test("neck stays connected behind the cabinet throughout travel and pointer motion", () => {
  const context = new Proxy({}, { get: () => () => ({ addColorStop() {} }) });
  const model = {
    head: new Object3D(),
    shoulder: new Vector3(-1.35, 1.78, -0.75),
    joints: Array.from({ length: 3 }, () => new Object3D()),
    links: Array.from({ length: 4 }, () => new Object3D()),
    cable: new Object3D(),
    screen_canvas: { getContext: () => context },
    texture: {},
  };
  for (let step = 0; step <= 20; step++) {
    for (const x of [-1, 0, 1])
      for (const y of [-1, 0, 1]) {
        for (const time of [0, Math.PI / 1.8, Math.PI / 0.6]) {
          pose_crt(model, time, { x, y }, step / 20, false);
          const [shoulder, elbow, wrist] = model.joints.map(
            (joint) => joint.position,
          );
          assert.ok(Math.abs(shoulder.distanceTo(elbow) - 1.3) < 1e-10);
          assert.ok(Math.abs(wrist.distanceTo(elbow) - 1.3) < 1e-10);
          model.head.updateMatrixWorld(true);
          const local_wrist = model.head.worldToLocal(wrist.clone());
          assert.ok(
            local_wrist.distanceTo(new Vector3(0, 0.28, -0.98)) < 1e-10,
          );
          for (const [start, end] of [
            [shoulder, elbow],
            [elbow, wrist],
          ]) {
            for (let sample = 0; sample <= 10; sample++) {
              const local = model.head.worldToLocal(
                start.clone().lerp(end, sample / 10),
              );
              // Cabinet rear is z=-0.775; allow room for link thickness.
              assert.ok(local.z < -0.86, `arm entered cabinet at ${local.z}`);
            }
          }
        }
      }
  }
});

test("CRT tube has convex glass, rounded boundary, forward normals and valid UVs", () => {
  const geometry = create_tube_geometry();
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  assert.ok(Math.abs(positions.getZ(0) - 0.15) < 1e-6);
  for (let i = 0; i < positions.count; i++) {
    assert.ok(normals.getZ(i) > 0);
    assert.ok(uv.getX(i) >= 0 && uv.getX(i) <= 1);
    assert.ok(uv.getY(i) >= 0 && uv.getY(i) <= 1);
  }
  for (let i = positions.count - 96; i < positions.count; i++) {
    assert.equal(positions.getZ(i), 0);
    assert.ok(
      Math.abs(positions.getX(i)) < 0.669 ||
        Math.abs(positions.getY(i)) < 0.489,
    );
  }
  geometry.dispose();
});
