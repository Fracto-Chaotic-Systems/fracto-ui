import {
  FEET_PER_WORLD_UNIT,
  MIN_WORLD_ALTITUDE,
  MAX_WORLD_ALTITUDE,
} from "./FlightUnits.js";

const EMPTY_FLIGHT_STATE = Object.freeze({
  source: "unavailable",
  position_re: -0.5,
  position_im: -2,
  altitude_world: 1,
  camera_heading_deg: 0,
  camera_pitch_deg: 0,
  pitch_deg: 0,
  roll_deg: 0,
  heading_deg: 0,
  airspeed_knots: 0,
  altitude_ft: 0,
  vertical_speed_fpm: 0,
  turn_rate_deg_s: 0,
  slip: 0,
  pressure_hpa: 1013.25,
});

export const PREVIEW_FLIGHT_STATE = Object.freeze({
  ...EMPTY_FLIGHT_STATE,
  source: "preview",
  pitch_deg: 5,
  roll_deg: -10,
  heading_deg: 45,
  airspeed_knots: 90,
  altitude_ft: 2500,
  vertical_speed_fpm: 500,
  turn_rate_deg_s: -1,
  pressure_hpa: 1013,
});

export const INITIAL_FLIGHT_STATE = Object.freeze({
  ...EMPTY_FLIGHT_STATE,
  source: "live",
  altitude_ft: FEET_PER_WORLD_UNIT,
});

const wrap_heading = (value) => ((value % 360) + 360) % 360;

function normalize_flight_state(patch, previous) {
  // Read only known fields; malformed telemetry retains the last finite value.
  const next = Object.fromEntries(
    Object.keys(EMPTY_FLIGHT_STATE).map((key) => [
      key,
      Number.isFinite(patch?.[key]) ? patch[key] : previous[key],
    ]),
  );
  next.source = ["preview", "live", "unavailable"].includes(patch?.source)
    ? patch.source
    : previous.source;
  next.pitch_deg = Math.max(-90, Math.min(90, next.pitch_deg));
  next.roll_deg = wrap_heading(next.roll_deg + 180) - 180;
  next.heading_deg = wrap_heading(next.heading_deg);
  next.camera_heading_deg = wrap_heading(next.camera_heading_deg);
  next.camera_pitch_deg = Math.max(-90, Math.min(90, next.camera_pitch_deg));
  next.altitude_world =
    next.altitude_world > 0
      ? Math.max(
          MIN_WORLD_ALTITUDE,
          Math.min(MAX_WORLD_ALTITUDE, next.altitude_world),
        )
      : previous.altitude_world;
  next.airspeed_knots = Math.max(0, next.airspeed_knots);
  next.slip = Math.max(-1, Math.min(1, next.slip));
  if (next.pressure_hpa <= 0) next.pressure_hpa = previous.pressure_hpa;
  return Object.freeze(next);
}

/** Per-game world pose, craft-relative look offsets, and unit-bearing telemetry. */
export function create_flight_state(initial_state) {
  const initial = normalize_flight_state(initial_state, EMPTY_FLIGHT_STATE);
  let snapshot = initial;
  const listeners = new Set();
  const update = (patch) => {
    const next = normalize_flight_state(patch, snapshot);
    if (Object.keys(next).every((key) => next[key] === snapshot[key])) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  return {
    get_snapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update,
    reset: () => update(initial),
  };
}
