import * as THREE from "three";

const SEGMENTS = 56;
const SIDES = 8;

export function create_crt_cables(scene, head) {
  return [0, 1].map((index) => {
    const anchor = new THREE.Vector3(-1.48 + index * 0.2, 1.88, -0.53);
    const port = new THREE.Vector3(-0.12 + index * 0.28, -0.5, -0.85);
    const socket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.15, 12),
      new THREE.MeshStandardMaterial({
        color: "#64777b",
        metalness: 0.7,
        roughness: 0.4,
      }),
    );
    socket.rotation.x = Math.PI / 2;
    socket.position.copy(port);
    head.add(socket);
    const radius = index ? 0.022 : 0.032;
    const curve = new THREE.LineCurve3(
      anchor,
      anchor.clone().add(new THREE.Vector3(0, -1, 0)),
    );
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, SEGMENTS, radius, SIDES, false),
      new THREE.MeshStandardMaterial({
        color: index ? "#8c6c42" : "#26383d",
        roughness: 0.7,
      }),
    );
    // The moving buffers are rewritten in place; no per-frame geometry allocation.
    mesh.frustumCulled = false;
    scene.add(mesh);
    return {
      anchor,
      port,
      mesh,
      radius,
      index,
      sway: 0,
      last_time: null,
      last_x: head.position.x,
    };
  });
}

export function crt_cable_curve(head, cable, extension, sway) {
  const { index, anchor, port } = cable;
  const slack = 1.2 + (1 - extension) * 0.12 + index * 0.12;
  const world = (x, y, z) =>
    new THREE.Vector3(x, y, z)
      .applyQuaternion(head.quaternion)
      .add(head.position);
  return new THREE.CatmullRomCurve3(
    [
      anchor.clone(),
      world(-1.18 - index * 0.09, 0.65, -0.96),
      world(-1.28 - index * 0.09 + sway, -0.55, -0.94),
      world(-0.98 + sway, -slack, -0.5),
      world(-0.3 + sway, -slack - 0.07, -0.4),
      world(port.x, -0.94, -0.97),
      world(port.x, port.y, port.z),
    ],
    false,
    "centripetal",
  );
}

export function update_crt_cables(
  cables,
  head,
  time,
  extension,
  reduced_motion,
) {
  for (const cable of cables) {
    const dt =
      cable.last_time === null
        ? 0
        : Math.min(0.1, Math.max(0, time - cable.last_time));
    const movement = dt ? (head.position.x - cable.last_x) / dt : 0;
    const target = reduced_motion
      ? 0
      : Math.sin(time * 1.8 + cable.index * 0.55) * 0.055 - movement * 0.18;
    cable.sway = reduced_motion
      ? 0
      : THREE.MathUtils.lerp(
          cable.sway,
          THREE.MathUtils.clamp(target, -0.2, 0.2),
          1 - Math.exp(-dt * 4),
        );
    cable.last_time = time;
    cable.last_x = head.position.x;
    const curve = crt_cable_curve(head, cable, extension, cable.sway);
    const positions = cable.mesh.geometry.getAttribute("position");
    const normals = cable.mesh.geometry.getAttribute("normal");
    const normal = new THREE.Vector3(),
      binormal = new THREE.Vector3(),
      radial = new THREE.Vector3();
    for (let ring = 0; ring <= SEGMENTS; ring++) {
      const t = ring / SEGMENTS;
      const center = curve.getPoint(t),
        tangent = curve.getTangent(t);
      normal.set(0, 0, 1);
      if (Math.abs(tangent.z) > 0.95) normal.set(0, 1, 0);
      normal.cross(tangent).normalize();
      binormal.crossVectors(tangent, normal).normalize();
      for (let side = 0; side <= SIDES; side++) {
        const angle = (side / SIDES) * Math.PI * 2;
        radial
          .copy(normal)
          .multiplyScalar(-Math.cos(angle))
          .addScaledVector(binormal, Math.sin(angle));
        const vertex = ring * (SIDES + 1) + side;
        normals.setXYZ(vertex, radial.x, radial.y, radial.z);
        positions.setXYZ(
          vertex,
          center.x + radial.x * cable.radius,
          center.y + radial.y * cable.radius,
          center.z + radial.z * cable.radius,
        );
      }
    }
    positions.needsUpdate = true;
    normals.needsUpdate = true;
  }
}
