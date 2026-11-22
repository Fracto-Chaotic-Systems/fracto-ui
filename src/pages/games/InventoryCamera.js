import { Vector3 } from "three";

// Fit projected box corners rather than a sphere, which wastes space for flat
// grass cards and ground patches. Reference objects retain their real scale.
export function inventory_camera_position(
  size,
  target,
  aspect,
  fov,
  reference,
) {
  const direction = new Vector3(1, 0.65, 1.15).normalize();
  const right = new Vector3()
    .crossVectors(new Vector3(0, 1, 0), direction)
    .normalize();
  const up = new Vector3().crossVectors(direction, right);
  const vertical = Math.tan((fov * Math.PI) / 360),
    horizontal = vertical * aspect;
  let distance = 0.25;
  const include = (x, y, z) => {
    const point = new Vector3(x, y, z).sub(target),
      depth = point.dot(direction);
    distance = Math.max(
      distance,
      depth + Math.abs(point.dot(right)) / horizontal,
      depth + Math.abs(point.dot(up)) / vertical,
    );
  };
  for (const x of [-size.x / 2, size.x / 2])
    for (const y of [0, size.y])
      for (const z of [-size.z / 2, size.z / 2]) include(x, y, z);
  for (const y of [0, 1]) include(-0.8, y, 0);
  if (reference)
    for (const x of [0.85, 1.85])
      for (const y of [0, 1]) for (const z of [-0.5, 0.5]) include(x, y, z);
  return target.clone().addScaledVector(direction, distance * 1.12 + 0.05);
}
