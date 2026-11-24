import { validate_path_motion } from "@fracto/sdk/FractoPathMotion.js";

export async function load_path_motion(url, signal) {
  const response = await fetch(url, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("path_motion_unavailable");
  return validate_path_motion(await response.json());
}

// A camera adapter only: the SDK owns all path timing, position and heading.
// Heading zero points along +Z; camera screen-up follows that direction.
export function apply_top_down_path_pose(camera, pose, elevation = 10) {
  const [x, y, z] = pose.position;
  camera.position.set(x, y + elevation, z);
  camera.up.set(
    Math.sin(pose.heading_radians),
    0,
    Math.cos(pose.heading_radians),
  );
  camera.lookAt(x, y, z);
  camera.updateMatrixWorld();
}
