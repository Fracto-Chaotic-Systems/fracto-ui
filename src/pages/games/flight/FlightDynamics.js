import {
  FEET_PER_WORLD_UNIT,
  FEET_PER_KNOT_SECOND,
  MIN_WORLD_ALTITUDE,
  MAX_WORLD_ALTITUDE,
} from "./FlightUnits.js";

const RAD = Math.PI / 180;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const command = (controls, code) =>
  Number.isFinite(controls?.[code]) ? clamp(controls[code], -1, 1) : 0;

function turn_rate(roll, speed, yaw) {
  const bank_turn =
    speed >= 1
      ? (9.80665 * Math.tan(roll * RAD)) / ((speed * 1852) / 3600) / RAD
      : 0;
  return clamp(bank_turn + yaw * 6, -12, 12);
}

function motion_readings(pitch, roll, speed, altitude, yaw) {
  return {
    vertical_speed_fpm:
      speed === 0 ||
      altitude === MIN_WORLD_ALTITUDE ||
      altitude === MAX_WORLD_ALTITUDE
        ? 0
        : altitude * speed * FEET_PER_KNOT_SECOND * Math.sin(pitch * RAD) * 60,
    turn_rate_deg_s: turn_rate(roll, speed, yaw),
    slip: yaw,
  };
}

/** Neutralize only the accumulated values controlled by the selected stick. */
export function neutralize_flight_channels(state, channels) {
  const fields = {
    move_x: "roll_deg",
    move_y: "airspeed_knots",
    pitch: "pitch_deg",
    roll: "roll_deg",
    speed: "airspeed_knots",
    yaw: "slip",
    look_x: "camera_heading_deg",
    look_y: "camera_pitch_deg",
  };
  const next = { ...state };
  let changed = false;
  let motion_changed = false;
  for (const channel of channels ?? []) {
    const field = fields[channel];
    if (typeof field === "string" && next[field] !== 0) {
      next[field] = 0;
      changed = true;
      if (!field.startsWith("camera_")) motion_changed = true;
    }
  }
  if (!changed) return state;
  return motion_changed
    ? {
        ...next,
        ...motion_readings(
          next.pitch_deg,
          next.roll_deg,
          next.airspeed_knots,
          next.altitude_world,
          next.slip,
        ),
      }
    : next;
}

/** A bounded, time-based game model; instrument display preferences do not affect physics. */
export function step_flight_state(state, controls, elapsed_seconds) {
  if (
    !controls?.connected ||
    !Number.isFinite(elapsed_seconds) ||
    elapsed_seconds <= 0
  )
    return state;
  const dt = Math.min(elapsed_seconds, 0.1);
  const pitch_input = command(controls, "pitch");
  const roll_input = clamp(
    command(controls, "roll") + command(controls, "move_x"),
    -1,
    1,
  );
  // Triggers provide coarse throttle changes; the movement stick stays fine.
  const speed_change_knots_s = clamp(
    command(controls, "speed") * 100 + command(controls, "move_y") * 10,
    -100,
    100,
  );
  const yaw = command(controls, "yaw");
  const pitch_deg = clamp(state.pitch_deg + pitch_input * 20 * dt, -30, 30);
  const roll_deg = clamp(state.roll_deg + roll_input * 40 * dt, -60, 60);
  const airspeed_knots = clamp(
    state.airspeed_knots + speed_change_knots_s * dt,
    0,
    300,
  );
  const mid_pitch = (state.pitch_deg + pitch_deg) / 2;
  const mid_roll = (state.roll_deg + roll_deg) / 2;
  const mid_speed = (state.airspeed_knots + airspeed_knots) / 2;
  const speed_per_altitude =
    (mid_speed * FEET_PER_KNOT_SECOND) / FEET_PER_WORLD_UNIT;
  const climb_exponent = speed_per_altitude * Math.sin(mid_pitch * RAD) * dt;
  // Solve dh/dt = k*h rather than subtracting a linear descent step.
  const altitude_world = clamp(
    state.altitude_world * Math.exp(climb_exponent),
    MIN_WORLD_ALTITUDE,
    MAX_WORLD_ALTITUDE,
  );
  const mean_altitude =
    state.altitude_world *
    (climb_exponent === 0 ? 1 : Math.expm1(climb_exponent) / climb_exponent);
  const distance =
    speed_per_altitude * mean_altitude * Math.cos(mid_pitch * RAD) * dt;
  const heading_delta = turn_rate(mid_roll, mid_speed, yaw) * dt;
  const mid_heading = (state.heading_deg + heading_delta / 2) * RAD;
  return {
    ...state,
    source: "live",
    pitch_deg,
    roll_deg,
    airspeed_knots,
    // North is +imaginary; clockwise headings turn toward +real. No reverse.
    position_re: state.position_re + distance * Math.sin(mid_heading),
    position_im: state.position_im + distance * Math.cos(mid_heading),
    altitude_world,
    camera_heading_deg:
      (((state.camera_heading_deg + command(controls, "look_x") * 90 * dt) %
        360) +
        360) %
      360,
    camera_pitch_deg: clamp(
      state.camera_pitch_deg + command(controls, "look_y") * 90 * dt,
      -90,
      90,
    ),
    heading_deg: (((state.heading_deg + heading_delta) % 360) + 360) % 360,
    altitude_ft: altitude_world * FEET_PER_WORLD_UNIT,
    ...motion_readings(
      pitch_deg,
      roll_deg,
      airspeed_knots,
      altitude_world,
      yaw,
    ),
  };
}
