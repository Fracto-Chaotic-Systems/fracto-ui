import { create_auto_pilot_attitude } from "./AutoPilotAttitude.js";
import { auto_pilot_view } from "./AutoPilotView.js";
import {
  compile_flight_plan,
  DEFAULT_FLIGHT_PLAN,
  valid_flight_plan_pose,
} from "./FlightPlan.js";
import { FEET_PER_WORLD_UNIT, FEET_PER_KNOT_SECOND } from "./FlightUnits.js";

const RAD = Math.PI / 180;
const wrap = (angle) => ((angle % 360) + 360) % 360;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** Session-owned pilot; set_plan() replaces the route without restarting RAF or input. */
export function create_auto_pilot(
  initial_plan = DEFAULT_FLIGHT_PLAN,
  initial_tuning,
) {
  const attitude = create_auto_pilot_attitude(initial_tuning);
  let sample = compile_flight_plan(initial_plan);
  let enabled = false;
  let elapsed_seconds = 0;
  let entry_state = null;
  let previous_heading = null;
  let previous_dt = null;
  let look_heading = 0;
  let look_pitch = 0;
  const listeners = new Set();
  const restart = () => {
    elapsed_seconds = 0;
    entry_state = null;
    previous_heading = null;
    previous_dt = null;
    attitude.reset();
  };
  const pilot = {
    get_snapshot: () => enabled,
    get_tuning: attitude.get_tuning,
    set_tuning: attitude.set_tuning,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set_enabled(value) {
      if (enabled === !!value) return;
      enabled = !!value;
      look_heading = 0;
      look_pitch = 0;
      restart();
      listeners.forEach((listener) => listener());
    },
    set_plan(plan) {
      const next = compile_flight_plan(plan);
      sample = next;
      restart();
    },
    recenter_look(state, channels) {
      if (
        !channels?.some(
          (channel) => channel === "look_x" || channel === "look_y",
        )
      )
        return state;
      if (channels.includes("look_x")) look_heading = 0;
      if (channels.includes("look_y")) look_pitch = 0;
      return auto_pilot_view(state, look_heading, look_pitch);
    },
    step(state, controls, seconds) {
      if (!enabled || !Number.isFinite(seconds) || seconds <= 0) return state;
      const dt = Math.min(seconds, 0.1);
      entry_state ??= Object.freeze({ ...state });
      const next_time = elapsed_seconds + dt;
      let pose;
      try {
        pose = sample({ elapsed_seconds: next_time, entry_state });
      } catch {
        pilot.set_enabled(false);
        return state;
      }
      if (!valid_flight_plan_pose(pose)) {
        pilot.set_enabled(false);
        return state;
      }
      elapsed_seconds = next_time;
      const re = pose.position_re - state.position_re;
      const im = pose.position_im - state.position_im;
      const rise = pose.altitude_world - state.altitude_world;
      const distance = Math.hypot(re, im);
      const heading =
        distance > 1e-12 ? wrap(Math.atan2(re, im) / RAD) : state.heading_deg;
      // The first sample establishes the tangent rather than treating the manual
      // heading at engagement as an instantaneous turn.
      const turn_rate_deg_s =
        previous_heading === null
          ? 0
          : // Chord headings describe frame midpoints. With uneven RAF timing,
            // their separation is the mean of the two frame durations.
            (wrap(heading - previous_heading + 180) - 180) /
            ((previous_dt + dt) / 2);
      previous_heading = heading;
      previous_dt = dt;
      const tuning = attitude.get_tuning();
      const turn_error =
        clamp(turn_rate_deg_s, -12, 12) - state.turn_rate_deg_s;
      const displayed_turn_rate =
        state.turn_rate_deg_s +
        clamp(
          turn_error * -Math.expm1(-dt / tuning.turn_response_seconds),
          -tuning.turn_acceleration_deg_s2 * dt,
          tuning.turn_acceleration_deg_s2 * dt,
        );
      const speed_world = Math.hypot(distance, rise) / dt;
      const airspeed_knots =
        (speed_world * FEET_PER_WORLD_UNIT) /
        (((state.altitude_world + pose.altitude_world) / 2) *
          FEET_PER_KNOT_SECOND);
      const look = (channel) =>
        controls?.connected && Number.isFinite(controls[channel])
          ? clamp(controls[channel], -1, 1)
          : 0;
      look_heading = wrap(look_heading + look("look_x") * 90 * dt);
      look_pitch = clamp(look_pitch + look("look_y") * 90 * dt, -90, 90);
      return auto_pilot_view(
        {
          ...state,
          position_re: pose.position_re,
          position_im: pose.position_im,
          altitude_world: pose.altitude_world,
          source: "live",
          ...attitude.step(
            state,
            {
              heading_deg: heading,
              pitch_deg: Math.atan2(rise, distance) / RAD,
              roll_deg: clamp(
                Math.atan(
                  (turn_rate_deg_s * RAD * airspeed_knots * 1852) /
                    3600 /
                    9.80665,
                ) / RAD,
                -60,
                60,
              ),
            },
            dt,
          ),
          airspeed_knots,
          altitude_ft: pose.altitude_world * FEET_PER_WORLD_UNIT,
          vertical_speed_fpm: ((rise * FEET_PER_WORLD_UNIT) / dt) * 60,
          turn_rate_deg_s: displayed_turn_rate,
          slip: 0,
        },
        look_heading,
        look_pitch,
      );
    },
  };
  return pilot;
}
