const RAD = Math.PI / 180;
const FEET_PER_KNOT_SECOND = 6076.11549 / 3600;
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
  const speed_input = clamp(
    command(controls, "speed") + command(controls, "move_y"),
    -1,
    1,
  );
  const yaw = command(controls, "yaw");
  const pitch_deg = clamp(state.pitch_deg + pitch_input * 20 * dt, -30, 30);
  const roll_deg = clamp(state.roll_deg + roll_input * 40 * dt, -60, 60);
  const airspeed_knots = clamp(
    state.airspeed_knots + speed_input * 10 * dt,
    0,
    300,
  );
  const mid_pitch = (state.pitch_deg + pitch_deg) / 2;
  const mid_roll = (state.roll_deg + roll_deg) / 2;
  const mid_speed = (state.airspeed_knots + airspeed_knots) / 2;
  const climb_ft_s =
    mid_speed * FEET_PER_KNOT_SECOND * Math.sin(mid_pitch * RAD);
  const altitude_ft = Math.max(0, state.altitude_ft + climb_ft_s * dt);
  return {
    ...state,
    source: "live",
    pitch_deg,
    roll_deg,
    airspeed_knots,
    heading_deg:
      (((state.heading_deg + turn_rate(mid_roll, mid_speed, yaw) * dt) % 360) +
        360) %
      360,
    altitude_ft,
    vertical_speed_fpm:
      altitude_ft === 0 && pitch_deg < 0
        ? 0
        : airspeed_knots *
          FEET_PER_KNOT_SECOND *
          Math.sin(pitch_deg * RAD) *
          60,
    turn_rate_deg_s: turn_rate(roll_deg, airspeed_knots, yaw),
    slip: yaw,
  };
}
