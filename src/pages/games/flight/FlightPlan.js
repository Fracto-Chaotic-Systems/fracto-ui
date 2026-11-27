import { MIN_WORLD_ALTITUDE, MAX_WORLD_ALTITUDE } from "./FlightUnits.js";

export const DEFAULT_FLIGHT_PLAN = Object.freeze({
  type: "figure_eight",
  center_re: -0.75,
  center_im: 0,
  radius: 1.5,
  altitude_world: 1,
  period_seconds: 180,
  clockwise: true,
});

/** A plan is an orbit/figure-eight definition or a pure sampler ({ elapsed_seconds, entry_state }).
 * Samplers return { position_re, position_im, altitude_world } in world units.
 * They can describe predefined routes or read live targets on every frame.
 */
export function compile_flight_plan(plan) {
  if (typeof plan === "function") return plan;
  if (
    !["orbit", "figure_eight"].includes(plan?.type) ||
    ![
      plan.center_re,
      plan.center_im,
      plan.radius,
      plan.altitude_world,
      plan.period_seconds,
    ].every(Number.isFinite) ||
    plan.radius <= 0 ||
    plan.period_seconds <= 0 ||
    plan.altitude_world < MIN_WORLD_ALTITUDE ||
    plan.altitude_world > MAX_WORLD_ALTITUDE
  )
    throw new TypeError("Invalid flight plan");
  const orbit = { ...plan };
  if (orbit.type === "figure_eight") {
    const point = (angle) => ({
      re: orbit.radius * Math.sin(angle),
      im: (orbit.radius * Math.sin(2 * angle)) / 2,
    });
    let previous_entry = null;
    let phase = 0;
    let origin;
    return ({ elapsed_seconds: t, entry_state: entry }) => {
      if (entry !== previous_entry) {
        previous_entry = entry;
        // Join the nearest part of either lobe, preserving the engagement pose.
        let nearest = Infinity;
        for (let i = 0; i < 720; i++) {
          const angle = (i * 2 * Math.PI) / 720;
          const candidate = point(angle);
          const distance = Math.hypot(
            orbit.center_re + candidate.re - entry.position_re,
            orbit.center_im + candidate.im - entry.position_im,
          );
          if (distance < nearest) {
            nearest = distance;
            phase = angle;
          }
        }
        origin = point(phase);
      }
      const angle =
        phase +
        ((orbit.clockwise === false ? -1 : 1) * 2 * Math.PI * t) /
          orbit.period_seconds;
      const target = point(angle);
      const blend = Math.exp(-t / 2);
      return {
        position_re:
          orbit.center_re +
          target.re +
          (entry.position_re - orbit.center_re - origin.re) * blend,
        position_im:
          orbit.center_im +
          target.im +
          (entry.position_im - orbit.center_im - origin.im) * blend,
        altitude_world:
          orbit.altitude_world +
          (entry.altitude_world - orbit.altitude_world) * blend,
      };
    };
  }
  return ({ elapsed_seconds: t, entry_state: entry }) => {
    const re = entry.position_re - orbit.center_re;
    const im = entry.position_im - orbit.center_im;
    const initial_radius = Math.hypot(re, im);
    const angle =
      Math.atan2(re, im) +
      ((orbit.clockwise === false ? -1 : 1) * 2 * Math.PI * t) /
        orbit.period_seconds;
    // Capture the circle smoothly from the engagement/replacement pose.
    const blend = Math.exp(-t / 2);
    const radius = orbit.radius + (initial_radius - orbit.radius) * blend;
    return {
      position_re: orbit.center_re + radius * Math.sin(angle),
      position_im: orbit.center_im + radius * Math.cos(angle),
      altitude_world:
        orbit.altitude_world +
        (entry.altitude_world - orbit.altitude_world) * blend,
    };
  };
}

export function valid_flight_plan_pose(pose) {
  return (
    pose &&
    [pose.position_re, pose.position_im, pose.altitude_world].every(
      Number.isFinite,
    ) &&
    pose.altitude_world >= MIN_WORLD_ALTITUDE &&
    pose.altitude_world <= MAX_WORLD_ALTITUDE
  );
}
