import * as THREE from "three";
import { update_crt_cables } from "./CrtCables.js";

// Constant-length two-bone IK: extension folds the elbow rather than stretching
// either arm. The wrist attaches behind the cabinet; the elbow folds left/rear.
export function solve_crt_arm(shoulder, wrist, upper = 1.3, lower = 1.3) {
  const direction = wrist.clone().sub(shoulder);
  const distance = THREE.MathUtils.clamp(
    direction.length(),
    0.01,
    upper + lower - 0.001,
  );
  direction.normalize();
  const along =
    (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const bend = new THREE.Vector3(-1, 0, 0.35);
  bend.addScaledVector(direction, -bend.dot(direction)).normalize();
  return shoulder
    .clone()
    .addScaledVector(direction, along)
    .addScaledVector(
      bend,
      Math.sqrt(Math.max(0, upper * upper - along * along)),
    );
}

function connect(mesh, from, to) {
  const difference = to.clone().sub(from);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.scale.y = difference.length();
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    difference.normalize(),
  );
}

function draw_face(model, time, pointer, reduced_motion) {
  const ctx = model.screen_canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(256, 180, 15, 256, 180, 320);
  gradient.addColorStop(0, "#17483f");
  gradient.addColorStop(1, "#03120f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 384);
  const blink = !reduced_motion && time % 5.7 > 5.53;
  const eye_height = blink ? 5 : 48;
  ctx.shadowColor = "#80ffd0";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#a2ffda";
  for (const x of [174, 338]) {
    ctx.beginPath();
    ctx.roundRect(
      x - 21 + pointer.x * 16,
      172 - eye_height / 2 - pointer.y * 10,
      42,
      eye_height,
      12,
    );
    ctx.fill();
  }
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#8cefc8";
  ctx.beginPath();
  ctx.arc(256, 226, 35, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  for (let y = 0; y < 384; y += 4) ctx.fillRect(0, y, 512, 1);
  const reflection = ctx.createLinearGradient(0, 0, 320, 384);
  reflection.addColorStop(0, "rgba(255,255,255,0.15)");
  reflection.addColorStop(0.42, "rgba(255,255,255,0)");
  ctx.fillStyle = reflection;
  ctx.fillRect(0, 0, 512, 384);
  model.texture.needsUpdate = true;
}

export function pose_crt(model, time, pointer, extension, reduced_motion) {
  const idle = reduced_motion ? 0 : Math.sin(time * 0.9);
  model.head.position.set(
    -0.28 + extension * 0.32,
    0.99 - extension * 0.2 + idle * 0.035,
    -0.08 + extension * 0.6,
  );
  // Keep the support on the rear mounting plate as the cabinet swivels/tilts.
  // Solving to the cabinet center lets the forearm pass through its shell.
  model.head.rotation.set(
    -0.08 - pointer.y * 0.16,
    0.85 + pointer.x * 0.22,
    -0.045 + pointer.x * 0.07 + idle * 0.025,
  );
  const wrist = new THREE.Vector3(0, 0.28, -0.98)
    .applyQuaternion(model.head.quaternion)
    .add(model.head.position);
  const elbow = solve_crt_arm(model.shoulder, wrist);
  const points = [model.shoulder, elbow, wrist];
  points.forEach((point, i) => model.joints[i].position.copy(point));
  for (let bone = 0; bone < 2; bone++) {
    for (let side = 0; side < 2; side++) {
      const offset = new THREE.Vector3(0, 0, side ? 0.13 : -0.13);
      connect(
        model.links[bone * 2 + side],
        points[bone].clone().add(offset),
        points[bone + 1].clone().add(offset),
      );
    }
  }
  connect(
    model.cable,
    model.shoulder,
    elbow.clone().add(new THREE.Vector3(0.12, -0.06, 0)),
  );
  model.joints[2].quaternion
    .copy(model.head.quaternion)
    .multiply(
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        Math.PI / 2,
      ),
    );
  if (model.cables)
    update_crt_cables(
      model.cables,
      model.head,
      time,
      extension,
      reduced_motion,
    );
  draw_face(model, time, pointer, reduced_motion);
}
