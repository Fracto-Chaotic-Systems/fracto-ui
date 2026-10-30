import { Vector3 } from "three";
import { TERRAIN_HEIGHT_SCOPE_RATIO } from "./SimulatorTerrainData.js";

const aspect_of = (aspect) =>
  Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
export const flight_region_key = (region) =>
  JSON.stringify([
    region.focal_point.x,
    region.focal_point.y,
    region.scope,
    aspect_of(region.aspect_ratio),
  ]);
export function inside_flight_region(position, aspect) {
  return (
    Math.abs(position.x) < 0.5 && Math.abs(position.z) < aspect_of(aspect) / 2
  );
}
export function prepare_flight_pose(camera, aspect, force = false) {
  if (force || !inside_flight_region(camera.position, aspect)) {
    camera.position.set(
      0,
      TERRAIN_HEIGHT_SCOPE_RATIO * 2,
      Math.min(0.25, aspect_of(aspect) * 0.25),
    );
    camera.quaternion.identity();
    camera.up.set(0, 1, 0);
  }
  return {
    position: camera.position.clone(),
    quaternion: camera.quaternion.clone(),
    up: camera.up.clone(),
  };
}

/** Stop at the first crossed horizontal boundary; altitude and orientation are unrestricted. */
export function confine_flight(previous, position, aspect) {
  const inset = 1e-7 * Math.min(1, aspect_of(aspect)),
    halfX = 0.5 - inset,
    halfZ = aspect_of(aspect) / 2 - inset;
  if (Math.abs(position.x) <= halfX && Math.abs(position.z) <= halfZ)
    return false;
  const end = position.clone();
  let fraction = 1;
  for (const [axis, half] of [
    ["x", halfX],
    ["z", halfZ],
  ]) {
    const delta = end[axis] - previous[axis];
    if (Math.abs(end[axis]) > half && delta !== 0)
      fraction = Math.min(
        fraction,
        Math.max(0, ((end[axis] > 0 ? half : -half) - previous[axis]) / delta),
      );
  }
  position.copy(previous).lerp(end, fraction);
  position.x = Math.max(-halfX, Math.min(halfX, position.x));
  position.z = Math.max(-halfZ, Math.min(halfZ, position.z));
  return true;
}
export function flight_boundary_status(camera, speed, aspect) {
  const height = aspect_of(aspect),
    margin = Math.min(
      0.5 - Math.abs(camera.position.x),
      height / 2 - Math.abs(camera.position.z),
    );
  if (margin <= 2e-7 * Math.min(1, height)) return "edge";
  const ahead = camera.position
    .clone()
    .addScaledVector(
      camera.getWorldDirection(new Vector3()),
      Math.min(Math.max(0, speed || 0) * 2, 0.4),
    );
  return margin < 0.08 * Math.min(1, height) ||
    !inside_flight_region(ahead, height)
    ? "near"
    : null;
}
