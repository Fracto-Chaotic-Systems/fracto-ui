import {
  create_auto_pilot_attitude,
  DEFAULT_AUTO_PILOT_TUNING,
} from "../src/pages/games/flight/AutoPilotAttitude.js";
import { auto_pilot_view } from "../src/pages/games/flight/AutoPilotView.js";
import { create_flight_projection } from "../src/pages/games/flight/FlightProjection.js";
import assert from "node:assert/strict";
import test from "node:test";
import { create_auto_pilot } from "../src/pages/games/flight/AutoPilot.js";
import { DEFAULT_FLIGHT_PLAN } from "../src/pages/games/flight/FlightPlan.js";
import {
  create_flight_state,
  INITIAL_FLIGHT_STATE,
} from "../src/pages/games/flight/FlightState.js";
import { start_flight_simulation } from "../src/pages/games/flight/FlightSimulation.js";
import { create_controller_input } from "../src/pages/games/controllers/ControllerInput.js";
import {
  create_flight_controls,
  bind_flight_controls,
} from "../src/pages/games/controllers/FlightControls.js";
import { normalize_flight_control_settings } from "../src/pages/games/controllers/FlightControlSettings.js";

const close = (a, b, tolerance = 1e-7) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const orbit_state = {
  ...INITIAL_FLIGHT_STATE,
  position_re: -0.75,
  position_im: 1.5,
};

test("default orbit completes a circle at the specified center, radius and height at different frame rates", () => {
  for (const hz of [30, 60, 120]) {
    const pilot = create_auto_pilot();
    pilot.set_enabled(true);
    let state = orbit_state;
    for (let i = 0; i < 120 * hz; i++) {
      state = pilot.step(state, { connected: false }, 1 / hz);
      close(Math.hypot(state.position_re + 0.75, state.position_im), 1.5);
      close(state.altitude_world, 1);
      close(state.altitude_ft, 2500);
      assert.equal(state.vertical_speed_fpm, 0);
    }
    close(state.position_re, orbit_state.position_re);
    close(state.position_im, orbit_state.position_im);
    close(state.turn_rate_deg_s, 3, 1e-5);
    assert.ok(state.airspeed_knots > 100 && state.airspeed_knots < 120);
    assert.ok(state.roll_deg > 0);
  }
});

test("capture converges from an arbitrary pose without teleporting, and manual channels cannot change the route", () => {
  const pilot = create_auto_pilot();
  pilot.set_enabled(true);
  let state = { ...INITIAL_FLIGHT_STATE, altitude_world: 2 };
  const first = pilot.step(
    state,
    {
      connected: true,
      pitch: 1,
      yaw: 1,
      roll: 1,
      move_x: 1,
      move_y: 1,
      speed: 1,
      look_x: 1,
      look_y: 1,
    },
    0.1,
  );
  assert.ok(
    Math.hypot(
      first.position_re - state.position_re,
      first.position_im - state.position_im,
    ) < 0.1,
  );
  assert.ok(first.altitude_world < 2 && first.altitude_world > 1.9);

  const other = create_auto_pilot();
  other.set_enabled(true);
  const neutral = other.step(state, { connected: false }, 0.1);
  close((first.camera_heading_deg - neutral.camera_heading_deg + 360) % 360, 9);
  close(first.camera_pitch_deg, neutral.camera_pitch_deg + 9);
  for (const key of [
    "position_re",
    "position_im",
    "altitude_world",
    "heading_deg",
    "airspeed_knots",
  ])
    close(first[key], neutral[key]);
  for (let i = 0; i < 400; i++)
    state = pilot.step(i === 0 ? first : state, {}, 0.1);
  close(Math.hypot(state.position_re + 0.75, state.position_im), 1.5);
  close(state.altitude_world, 1);
});

test("plans can be replaced live with definitions or dynamic samplers, and invalid plans never corrupt state", () => {
  const pilot = create_auto_pilot();
  pilot.set_enabled(true);
  let state = pilot.step(orbit_state, {}, 0.1);
  pilot.set_plan({ ...DEFAULT_FLIGHT_PLAN, radius: 2, altitude_world: 1.5 });
  const next = pilot.step(state, {}, 0.1);
  assert.ok(
    Math.hypot(
      next.position_re - state.position_re,
      next.position_im - state.position_im,
    ) < 0.1,
  );
  let speed = 0.1;
  const seen = [];
  pilot.set_plan(({ elapsed_seconds, entry_state }) => {
    seen.push(elapsed_seconds);
    return {
      position_re: entry_state.position_re + speed * elapsed_seconds,
      position_im: entry_state.position_im,
      altitude_world: entry_state.altitude_world,
    };
  });
  state = pilot.step(next, {}, 0.1);
  close(state.position_re, next.position_re + 0.01);
  speed = 0.2;
  state = pilot.step(state, {}, 0.1);
  close(state.position_re, next.position_re + 0.04);
  assert.deepEqual(seen, [0.1, 0.2]);
  assert.throws(
    () => pilot.set_plan({ ...DEFAULT_FLIGHT_PLAN, radius: -1 }),
    TypeError,
  );
  assert.equal(pilot.get_snapshot(), true);
  pilot.set_plan(() => ({ position_re: NaN }));
  assert.equal(pilot.step(state, {}, 0.1), state);
  assert.equal(pilot.get_snapshot(), false);
  pilot.set_enabled(true);
  pilot.set_plan(() => {
    throw Error("bad target");
  });
  assert.equal(pilot.step(state, {}, 0.1), state);
  assert.equal(pilot.get_snapshot(), false);
});

test("binding locks buttons and movement despite remaps, allows the right look stick/reset and restores manual mappings", () => {
  const input = create_controller_input(),
    controls = create_flight_controls(),
    pilot = create_auto_pilot();
  let changed;
  let settings = normalize_flight_control_settings({
    axes: {
      left_x: "look_x",
      left_y: "look_y",
      right_x: "roll",
      right_y: "speed",
    },
    buttons: { cross: "speed_up" },
  });
  const stop = bind_flight_controls(input, controls, {
    auto_pilot: pilot,
    read_settings: () => settings,
    subscribe_settings: (f) => {
      changed = f;
      return () => {};
    },
  });
  const buttons = [{ pressed: true }];
  input.update({ connected: true, axes: [1, 1, 0.5, -0.5], buttons });
  assert.notEqual(controls.get_snapshot().speed, 0);
  pilot.set_enabled(true);
  let mapped = controls.get_snapshot();
  for (const channel of ["pitch", "roll", "yaw", "speed", "move_x", "move_y"])
    assert.equal(mapped[channel], 0);
  close(mapped.look_x, 0.375);
  close(mapped.look_y, 0.375);
  assert.deepEqual(mapped.actions, ["look"]);
  input.update({ connected: true, axes: [1, 1, 0, 0], buttons });
  close(controls.get_snapshot().look_x, 0);
  close(controls.get_snapshot().look_y, 0);
  settings = normalize_flight_control_settings();
  changed();
  const resets = [];
  controls.subscribe_neutralize((channels) => resets.push(channels));
  input.request_stick_reset(0);
  assert.equal(resets.length, 0);
  input.request_stick_reset(1);
  assert.deepEqual(resets, [["look_x", "look_y"]]);
  pilot.set_enabled(false);
  assert.notEqual(controls.get_snapshot().move_x, 0);
  stop();
  assert.equal(controls.get_snapshot().connected, false);
  pilot.set_enabled(true);
  assert.equal(controls.get_snapshot().connected, false);
});

function environment() {
  let pending,
    time = 0;
  const listeners = {};
  const surface = (prefix) => ({
    hidden: false,
    addEventListener: (key, fn) => {
      listeners[prefix + key] = fn;
    },
    removeEventListener: (key) => {
      delete listeners[prefix + key];
    },
  });
  const window = surface("w"),
    document = surface("d");
  window.requestAnimationFrame = (fn) => {
    pending = fn;
    return 1;
  };
  window.cancelAnimationFrame = () => {
    pending = null;
  };
  return {
    window,
    document,
    listeners,
    frame() {
      time += 100;
      const fn = pending;
      pending = null;
      fn?.(time);
    },
    pending: () => pending,
  };
}

test("one simulation switches between manual and autopilot, keeps looking available, pauses while hidden and cleans up", () => {
  const env = environment(),
    state = create_flight_state(orbit_state),
    controls = create_flight_controls(),
    pilot = create_auto_pilot();
  const stop = start_flight_simulation(state, controls, env, pilot);
  env.frame();
  env.frame();
  assert.deepEqual(state.get_snapshot(), orbit_state);
  pilot.set_enabled(true);
  env.frame();
  assert.notEqual(state.get_snapshot().position_re, orbit_state.position_re);
  const before = state.get_snapshot();
  controls.neutralize(["speed", "roll", "pitch"]);
  assert.equal(state.get_snapshot(), before);
  controls.update({ connected: true, axes: [0, 0, 1, -1] });
  env.frame();
  close(
    (state.get_snapshot().camera_heading_deg -
      auto_pilot_view(state.get_snapshot()).camera_heading_deg +
      360) %
      360,
    9,
  );
  controls.neutralize(["look_x"]);
  close(
    state.get_snapshot().camera_heading_deg,
    auto_pilot_view(state.get_snapshot()).camera_heading_deg,
  );
  env.document.hidden = true;
  env.listeners.dvisibilitychange();
  const hidden = state.get_snapshot();
  env.frame();
  assert.equal(state.get_snapshot(), hidden);
  env.document.hidden = false;
  env.listeners.dvisibilitychange();
  env.frame();
  assert.equal(state.get_snapshot(), hidden);
  env.frame();
  assert.notEqual(state.get_snapshot(), hidden);
  pilot.set_enabled(false);
  controls.reset();
  const manual = state.get_snapshot();
  env.frame();
  assert.equal(state.get_snapshot(), manual);
  stop();
  assert.equal(env.pending(), null);
  assert.equal(Object.keys(env.listeners).length, 0);
});

function assert_centered(state) {
  const projection = create_flight_projection(state, {
    width_px: 1,
    height_px: 1,
  });
  const target = {
    re: -0.75 - state.position_re,
    im: -state.position_im,
    up: -state.altitude_world,
  };
  const length = Math.hypot(target.re, target.im, target.up);
  for (const key of ["re", "im", "up"])
    close(projection.forward[key], target[key] / length);
}

test("autopilot centers the actual camera ray on the set throughout a circuit and during banked capture", () => {
  const pilot = create_auto_pilot();
  pilot.set_enabled(true);
  let state = {
    ...INITIAL_FLIGHT_STATE,
    altitude_world: 2,
    camera_heading_deg: 145,
    camera_pitch_deg: 63,
  };
  for (let i = 0; i < 1200; i++) {
    state = pilot.step(state, {}, 0.1);
    assert_centered(state);
  }
});

test("look offsets persist relative to the moving center, recenter immediately, survive plan replacement and reset on reengagement", () => {
  const pilot = create_auto_pilot();
  pilot.set_enabled(true);
  let state = pilot.step(
    orbit_state,
    { connected: true, look_x: 1, look_y: 0.5 },
    0.1,
  );
  let centered = auto_pilot_view(state);
  close(
    (state.camera_heading_deg - centered.camera_heading_deg + 360) % 360,
    9,
  );
  close(state.camera_pitch_deg - centered.camera_pitch_deg, 4.5);
  for (let i = 0; i < 50; i++) state = pilot.step(state, {}, 0.1);
  centered = auto_pilot_view(state);
  close(
    (state.camera_heading_deg - centered.camera_heading_deg + 360) % 360,
    9,
  );
  close(state.camera_pitch_deg - centered.camera_pitch_deg, 4.5);
  pilot.set_plan({ ...DEFAULT_FLIGHT_PLAN, radius: 2 });
  state = pilot.step(state, {}, 0.1);
  centered = auto_pilot_view(state);
  close(
    (state.camera_heading_deg - centered.camera_heading_deg + 360) % 360,
    9,
  );
  state = pilot.recenter_look(state, ["look_x", "look_y"]);
  assert_centered(state);
  state = pilot.step(state, { connected: true, look_x: -1 }, 0.1);
  pilot.set_enabled(false);
  pilot.set_enabled(true);
  state = pilot.step(state, {}, 0.1);
  assert_centered(state);
});

test("attitude corrections are gradual, cadence-limited and use the shortest heading arc", () => {
  for (const hz of [30, 60, 120]) {
    const smoother = create_auto_pilot_attitude();
    let state = { heading_deg: 359, pitch_deg: 0, roll_deg: 0 };
    for (let i = 0; i < hz * 10; i++) {
      const next = smoother.step(
        state,
        { heading_deg: 1, pitch_deg: 30, roll_deg: 60 },
        1 / hz,
      );
      assert.ok(Math.abs(next.roll_deg - state.roll_deg) <= 2 / hz + 1e-10);
      assert.ok(Math.abs(next.pitch_deg - state.pitch_deg) <= 1 / hz + 1e-10);
      assert.ok(
        Math.abs(((next.heading_deg - state.heading_deg + 540) % 360) - 180) <=
          6 / hz + 1e-10,
      );
      assert.ok(next.roll_deg >= state.roll_deg && next.roll_deg <= 20);
      state = next;
    }
    assert.ok(state.heading_deg < 2, "crosses zero along shortest arc");
    assert.ok(state.roll_deg > 10 && state.roll_deg <= 20);
  }
  const smoother = create_auto_pilot_attitude();
  let state = { heading_deg: 0, pitch_deg: 0, roll_deg: 0 };
  state = smoother.step(
    state,
    { heading_deg: 0, pitch_deg: 0, roll_deg: 10 },
    0.1,
  );
  // A transient opposite target before the next correction cannot reverse the bank.
  const next = smoother.step(
    state,
    { heading_deg: 0, pitch_deg: 0, roll_deg: -60 },
    0.1,
  );
  assert.ok(next.roll_deg > state.roll_deg);
  const tiny = create_auto_pilot_attitude();
  assert.deepEqual(
    tiny.step(
      { heading_deg: 0, pitch_deg: 0, roll_deg: 0 },
      { heading_deg: 0.05, pitch_deg: -0.05, roll_deg: 0.05 },
      0.1,
    ),
    { heading_deg: 0, pitch_deg: 0, roll_deg: 0 },
  );
});

test("live tuning accepts small isolated changes without resetting the route or view", () => {
  const pilot = create_auto_pilot();
  const reference = create_auto_pilot();
  pilot.set_enabled(true);
  reference.set_enabled(true);
  let state = pilot.step(orbit_state, {}, 0.1),
    other = reference.step(orbit_state, {}, 0.1);
  pilot.set_tuning({ roll_rate_deg_s: 0.5 });
  assert.equal(pilot.get_tuning().roll_rate_deg_s, 0.5);
  assert.equal(
    pilot.get_tuning().response_seconds,
    DEFAULT_AUTO_PILOT_TUNING.response_seconds,
  );
  assert.throws(() => pilot.set_tuning({ roll_rate_deg_s: -1 }), TypeError);
  assert.equal(pilot.get_tuning().roll_rate_deg_s, 0.5);
  const before = state;
  state = pilot.step(state, { connected: true, look_x: 1 }, 0.1);
  other = reference.step(other, {}, 0.1);
  close(state.position_re, other.position_re);
  close(state.position_im, other.position_im);
  assert.ok(Math.abs(state.roll_deg - before.roll_deg) <= 0.05 + 1e-10);
  const centered = auto_pilot_view(state);
  close(
    (state.camera_heading_deg - centered.camera_heading_deg + 360) % 360,
    9,
  );
});

test("uneven frame timing cannot spike the turn coordinator during a steady orbit", () => {
  for (const durations of [
    [0.005, 0.045],
    [1 / 120, 1 / 30, 1 / 60],
    [0.001, 0.099],
  ]) {
    const pilot = create_auto_pilot();
    pilot.set_enabled(true);
    let state = orbit_state,
      elapsed = 0,
      index = 0;
    let min = Infinity,
      max = -Infinity;
    while (elapsed < 30) {
      const dt = durations[index++ % durations.length];
      const next = pilot.step(state, {}, dt);
      assert.ok(
        Math.abs(next.turn_rate_deg_s - state.turn_rate_deg_s) <= dt + 1e-10,
        "needle obeys its slew limit",
      );
      assert.ok(
        next.turn_rate_deg_s >= -1e-8 && next.turn_rate_deg_s <= 3.0001,
        "steady clockwise motion cannot produce reversals or spikes",
      );
      if (elapsed > 15) {
        min = Math.min(min, next.turn_rate_deg_s);
        max = Math.max(max, next.turn_rate_deg_s);
      }
      elapsed += dt;
      state = next;
    }
    close(state.turn_rate_deg_s, 3, 1e-6);
    assert.ok(max - min < 0.001, "settled turn needle stays steady");
  }
});
