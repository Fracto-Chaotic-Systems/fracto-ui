// Scene X/Z span one navigator scope, irrespective of mesh level or sample count.
export const FLIGHT_MAX_SPEED_SCOPES_PER_SECOND = 0.2;

export function flight_readings(camera, speed, scope, terrain_height) {
  if (!Number.isFinite(scope) || scope <= 0) return null;
  return {
    speed_scopes: Math.max(0, speed || 0),
    speed_units: Math.max(0, speed || 0) * scope,
    altitude: camera.position.y * scope,
    clearance: Number.isFinite(terrain_height)
      ? (camera.position.y - terrain_height) * scope
      : null,
  };
}
