export const DEFAULT_AUTO_PILOT_TUNING = Object.freeze({
  correction_interval_seconds: 0.5,
  response_seconds: 3,
  turn_response_seconds: 1.5,
  turn_acceleration_deg_s2: 1,
  heading_rate_deg_s: 6,
  pitch_rate_deg_s: 1,
  roll_rate_deg_s: 2,
  max_bank_deg: 20,
  deadband_deg: 0.1,
});

export function normalize_auto_pilot_tuning(
  patch,
  previous = DEFAULT_AUTO_PILOT_TUNING,
) {
  const next = { ...previous };
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (
      !Object.hasOwn(DEFAULT_AUTO_PILOT_TUNING, key) ||
      !Number.isFinite(value) ||
      value <= 0 ||
      (key === "max_bank_deg" && value > 60)
    )
      throw new TypeError(`Invalid auto-pilot tuning: ${key}`);
    next[key] = value;
  }
  return Object.freeze(next);
}

const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));
const wrap = (value) => ((value % 360) + 360) % 360;

/** Reconsider targets at a measured cadence; ease toward them with hard slew limits. */
export function create_auto_pilot_attitude(initial_tuning) {
  let tuning = normalize_auto_pilot_tuning(initial_tuning);
  let target = null;
  let since_correction = 0;
  return {
    get_tuning: () => tuning,
    set_tuning(patch) {
      tuning = normalize_auto_pilot_tuning(patch, tuning);
    },
    reset() {
      target = null;
      since_correction = 0;
    },
    step(state, desired, dt) {
      since_correction += dt;
      if (
        !target ||
        since_correction >= tuning.correction_interval_seconds - 1e-9
      ) {
        target = {
          ...desired,
          roll_deg: clamp(desired.roll_deg, tuning.max_bank_deg),
        };
        since_correction = 0;
      }
      const approach = (key, rate, circular = false) => {
        const goal =
          key === "roll_deg"
            ? clamp(target[key], tuning.max_bank_deg)
            : target[key];
        const error = circular
          ? wrap(goal - state[key] + 180) - 180
          : goal - state[key];
        if (Math.abs(error) <= tuning.deadband_deg) return state[key];
        const change = clamp(
          error * -Math.expm1(-dt / tuning.response_seconds),
          rate * dt,
        );
        return circular ? wrap(state[key] + change) : state[key] + change;
      };
      return {
        heading_deg: approach("heading_deg", tuning.heading_rate_deg_s, true),
        pitch_deg: approach("pitch_deg", tuning.pitch_rate_deg_s),
        roll_deg: approach("roll_deg", tuning.roll_rate_deg_s),
      };
    },
  };
}
