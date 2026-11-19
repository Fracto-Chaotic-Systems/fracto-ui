import assert from "node:assert/strict";
import test from "node:test";
import { step_flight_state } from "../src/pages/games/flight/FlightDynamics.js";
import { start_flight_simulation } from "../src/pages/games/flight/FlightSimulation.js";
import {
  create_flight_state,
  INITIAL_FLIGHT_STATE,
} from "../src/pages/games/flight/FlightState.js";
import { create_controller_input } from "../src/pages/games/controllers/ControllerInput.js";
import {
  create_flight_controls,
  bind_flight_controls,
} from "../src/pages/games/controllers/FlightControls.js";
import {
  DEFAULT_FLIGHT_CONTROL_SETTINGS,
  normalize_flight_control_settings,
} from "../src/pages/games/controllers/FlightControlSettings.js";

const controls = (patch) => ({ connected: true, ...patch });
const FLYING_STATE = {
  ...INITIAL_FLIGHT_STATE,
  airspeed_knots: 90,
  heading_deg: 45,
};
const close = (actual, expected, tolerance = 1e-8) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${actual} != ${expected}`,
  );

test("mapped pitch, roll, speed and yaw update consistent live instrument readings", () => {
  const next = step_flight_state(
    FLYING_STATE,
    controls({ pitch: 1, roll: 1, speed: 1, yaw: 0.5 }),
    0.1,
  );
  assert.equal(next.source, "live");
  close(next.pitch_deg, 2);
  close(next.roll_deg, 4);
  close(next.airspeed_knots, 100);
  assert.ok(next.altitude_ft > 2500);
  assert.ok(next.vertical_speed_fpm > 0);
  assert.ok(next.heading_deg > 45);
  assert.ok(next.turn_rate_deg_s > 0);
  assert.equal(next.slip, 0.5);
  assert.equal(INITIAL_FLIGHT_STATE.pitch_deg, 0);
});

test("default movement banks and changes speed while look input leaves aircraft attitude alone", () => {
  const moved = step_flight_state(
    FLYING_STATE,
    controls({ move_x: -1, move_y: 1 }),
    0.1,
  );
  assert.equal(moved.roll_deg, -4);
  assert.equal(moved.airspeed_knots, 91);
  assert.ok(moved.heading_deg < 45);
  const looked = step_flight_state(
    INITIAL_FLIGHT_STATE,
    controls({ look_x: 1, look_y: 1 }),
    0.1,
  );
  assert.equal(looked.heading_deg, INITIAL_FLIGHT_STATE.heading_deg);
  assert.equal(looked.pitch_deg, INITIAL_FLIGHT_STATE.pitch_deg);
  assert.equal(looked.roll_deg, INITIAL_FLIGHT_STATE.roll_deg);
  assert.equal(looked.camera_heading_deg, 9);
  assert.equal(looked.camera_pitch_deg, 9);
  assert.equal(looked.position_re, INITIAL_FLIGHT_STATE.position_re);
  assert.equal(looked.position_im, INITIAL_FLIGHT_STATE.position_im);
});

test("brief trigger presses produce coarse proportional speed changes and retain hover bounds", () => {
  for (const hz of [30, 60, 120]) {
    const press = (state, speed) => {
      for (let i = 0; i < hz / 10; i++)
        state = step_flight_state(state, controls({ speed }), 1 / hz);
      return state;
    };
    const accelerated = press(INITIAL_FLIGHT_STATE, 1);
    close(accelerated.airspeed_knots, 10);
    close(press(accelerated, -0.5).airspeed_knots, 5);
    close(press(accelerated, 0).airspeed_knots, 10);
    close(press(accelerated, -1).airspeed_knots, 0);
    assert.equal(press(INITIAL_FLIGHT_STATE, -1).airspeed_knots, 0);
    assert.equal(
      press({ ...INITIAL_FLIGHT_STATE, airspeed_knots: 499 }, 1).airspeed_knots,
      500,
    );
    close(
      press({ ...INITIAL_FLIGHT_STATE, airspeed_knots: 300 }, 1).airspeed_knots,
      310,
    );
  }
});

test("release holds speed and attitude while existing bank and pitch continue the flight", () => {
  const flying = { ...FLYING_STATE, pitch_deg: 10, roll_deg: 20 };
  const next = step_flight_state(flying, controls({}), 0.1);
  assert.equal(next.pitch_deg, 10);
  assert.equal(next.roll_deg, 20);
  assert.equal(next.airspeed_knots, 90);
  assert.ok(next.altitude_ft > 2500);
  assert.ok(next.heading_deg > 45);
});

test("hover, envelope bounds, heading wrap and elapsed-time limits stay finite", () => {
  const grounded = step_flight_state(
    {
      ...INITIAL_FLIGHT_STATE,
      airspeed_knots: 0,
      pitch_deg: -10,
      roll_deg: 60,
    },
    controls({ speed: -1 }),
    0.1,
  );
  assert.equal(grounded.airspeed_knots, 0);
  assert.equal(grounded.altitude_ft, 2500);
  assert.equal(grounded.altitude_world, 1);
  assert.equal(grounded.position_re, INITIAL_FLIGHT_STATE.position_re);
  assert.equal(grounded.position_im, INITIAL_FLIGHT_STATE.position_im);
  assert.equal(grounded.vertical_speed_fpm, 0);
  assert.equal(grounded.turn_rate_deg_s, 0);
  const bounded = step_flight_state(
    {
      ...INITIAL_FLIGHT_STATE,
      pitch_deg: 30,
      roll_deg: 60,
      airspeed_knots: 500,
      heading_deg: 359.9,
    },
    controls({ pitch: 1, roll: 1, speed: 1, yaw: 1 }),
    0.1,
  );
  assert.equal(bounded.pitch_deg, 30);
  assert.equal(bounded.roll_deg, 60);
  assert.equal(bounded.airspeed_knots, 500);
  assert.ok(bounded.heading_deg >= 0 && bounded.heading_deg < 360);
  assert.ok(Math.abs(bounded.turn_rate_deg_s) <= 12);
  assert.ok(
    Object.values(bounded)
      .filter((v) => typeof v === "number")
      .every(Number.isFinite),
  );
  for (const time of [0, -1, NaN, Infinity])
    assert.strictEqual(
      step_flight_state(INITIAL_FLIGHT_STATE, controls({ speed: 1 }), time),
      INITIAL_FLIGHT_STATE,
    );
  assert.strictEqual(
    step_flight_state(
      INITIAL_FLIGHT_STATE,
      { connected: false, speed: 1 },
      0.1,
    ),
    INITIAL_FLIGHT_STATE,
  );
  assert.deepEqual(
    step_flight_state(INITIAL_FLIGHT_STATE, controls({ speed: 1 }), 10),
    step_flight_state(INITIAL_FLIGHT_STATE, controls({ speed: 1 }), 0.1),
  );
});

test("integration is consistent across common frame rates", () => {
  const integrate = (hz) => {
    // Compare steady flight rather than the near-hover bank-turn threshold.
    let state = FLYING_STATE;
    for (let frame = 0; frame < hz * 2; frame++)
      state = step_flight_state(
        state,
        controls({ pitch: 0.2, roll: 0.2, speed: 0.2 }),
        1 / hz,
      );
    return state;
  };
  const slow = integrate(10),
    fast = integrate(120);
  for (const key of ["pitch_deg", "roll_deg", "airspeed_knots"])
    close(slow[key], fast[key], 1e-6);
  close(slow.heading_deg, fast.heading_deg, 0.01);
  close(slow.vertical_speed_fpm, fast.vertical_speed_fpm, 0.01);
  close(slow.altitude_ft, fast.altitude_ft, 0.1);
  close(slow.position_re, fast.position_re, 1e-5);
  close(slow.position_im, fast.position_im, 1e-5);
});

function environment() {
  const frames = new Map(),
    windowListeners = new Map(),
    documentListeners = new Map();
  let id = 0;
  const target_window = {
    requestAnimationFrame: (callback) => {
      frames.set(++id, callback);
      return id;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    addEventListener: (name, callback) => windowListeners.set(name, callback),
    removeEventListener: (name) => windowListeners.delete(name),
  };
  const target_document = {
    hidden: false,
    addEventListener: (name, callback) => documentListeners.set(name, callback),
    removeEventListener: (name) => documentListeners.delete(name),
  };
  return {
    window: target_window,
    document: target_document,
    frames,
    windowListeners,
    documentListeners,
    frame(time) {
      const entry = frames.entries().next().value;
      assert.ok(entry, "one frame is scheduled");
      frames.delete(entry[0]);
      entry[1](time);
    },
  };
}

test("forward motion follows north/east/south/west and scales with altitude", () => {
  for (const [heading_deg, dx, dy] of [
    [0, 0, 1],
    [90, 1, 0],
    [180, 0, -1],
    [270, -1, 0],
  ]) {
    const seed = { ...FLYING_STATE, heading_deg };
    const next = step_flight_state(seed, controls({}), 0.1);
    const distance = ((90 * (6076.11549 / 3600)) / 2500) * 0.1;
    close(next.position_re - seed.position_re, dx * distance);
    close(next.position_im - seed.position_im, dy * distance);
    assert.equal(next.altitude_world, 1);
    const low = step_flight_state(
      { ...seed, altitude_world: 0.1 },
      controls({}),
      0.1,
    );
    close(low.position_re - seed.position_re, dx * distance * 0.1);
    close(low.position_im - seed.position_im, dy * distance * 0.1);
    assert.equal(low.airspeed_knots, next.airspeed_knots);
  }
});

test("descent is exponential, stays above the plane, and slows world motion", () => {
  const seed = { ...FLYING_STATE, pitch_deg: -30, heading_deg: 0 };
  let state = seed;
  for (let i = 0; i < 20000; i++)
    state = step_flight_state(state, controls({}), 0.1);
  const exponent = ((90 * (6076.11549 / 3600)) / 2500) * -0.5;
  close(state.altitude_world / Math.exp(exponent * 2000), 1, 1e-9);
  assert.ok(state.altitude_world > 0 && state.altitude_world < 1e-20);
  close(state.altitude_ft, state.altitude_world * 2500);
  assert.ok(state.vertical_speed_fpm < 0);
  assert.equal(state.airspeed_knots, 90);
  const next = step_flight_state(state, controls({}), 0.1);
  assert.ok(next.altitude_world < state.altitude_world);
  const high = step_flight_state(seed, controls({}), 0.1);
  close(
    state.vertical_speed_fpm / high.vertical_speed_fpm,
    state.altitude_world / high.altitude_world,
  );
});

test("braking stops at hover without backward motion, even with pitch and bank", () => {
  let state = {
    ...INITIAL_FLIGHT_STATE,
    airspeed_knots: 1,
    pitch_deg: -20,
    roll_deg: 20,
  };
  const braking = step_flight_state(state, controls({ move_y: -1 }), 0.1);
  assert.ok(braking.position_im > state.position_im);
  assert.equal(braking.airspeed_knots, 0);
  state = step_flight_state(braking, controls({ move_y: -1 }), 0.1);
  assert.equal(state.position_re, braking.position_re);
  assert.equal(state.position_im, braking.position_im);
  assert.equal(state.altitude_world, braking.altitude_world);
  assert.equal(state.vertical_speed_fpm, 0);
});

test("look offsets wrap, reach local poles and persist through craft turns", () => {
  let state = {
    ...INITIAL_FLIGHT_STATE,
    camera_heading_deg: 359,
    camera_pitch_deg: 89,
  };
  state = step_flight_state(state, controls({ look_x: 1, look_y: 1 }), 0.1);
  assert.equal(state.camera_heading_deg, 8);
  assert.equal(state.camera_pitch_deg, 90);
  const turned = step_flight_state(
    state,
    controls({ yaw: 1, pitch: 1, roll: 1 }),
    0.1,
  );
  assert.equal(turned.camera_heading_deg, 8);
  assert.equal(turned.camera_pitch_deg, 90);
  assert.ok(turned.heading_deg > state.heading_deg);
  for (let i = 0; i < 21; i++)
    state = step_flight_state(state, controls({ look_y: -1 }), 0.1);
  assert.equal(state.camera_pitch_deg, -90);
  state = step_flight_state(state, controls({ look_x: -1 }), 0.1);
  assert.equal(state.camera_heading_deg, 359);
});

test("real input mapping drives the store and updated bindings take effect without recreating the loop", () => {
  const env = environment(),
    input = create_controller_input(),
    mapped = create_flight_controls(),
    state = create_flight_state(INITIAL_FLIGHT_STATE);
  let settings = DEFAULT_FLIGHT_CONTROL_SETTINGS;
  let changed;
  const unbind = bind_flight_controls(input, mapped, {
    read_settings: () => settings,
    subscribe_settings: (callback) => {
      changed = callback;
      return () => {
        changed = null;
      };
    },
  });
  const stop = start_flight_simulation(state, mapped, env);
  const buttons = Array.from({ length: 18 }, () => ({ pressed: false }));
  buttons[7] = { value: 0.5 };
  input.update({ connected: true, buttons });
  env.frame(0);
  env.frame(100);
  close(state.get_snapshot().airspeed_knots, 5);
  buttons[7] = { value: 0 };
  buttons[12] = { pressed: true };
  input.update({ connected: true, buttons });
  env.frame(200);
  assert.equal(state.get_snapshot().pitch_deg, -2);
  settings = normalize_flight_control_settings({ invert_pitch: true });
  changed();
  env.frame(300);
  assert.equal(state.get_snapshot().pitch_deg, 0);
  buttons[12] = { pressed: false };
  input.update({ connected: true, buttons, axes: [0, 0, 1, -1] });
  env.frame(400);
  assert.equal(state.get_snapshot().camera_heading_deg, 9);
  assert.equal(state.get_snapshot().camera_pitch_deg, 9);
  assert.equal(state.get_snapshot().pitch_deg, 0);
  input.reset();
  const disconnected = state.get_snapshot();
  env.frame(500);
  assert.deepEqual(state.get_snapshot(), disconnected);
  stop();
  unbind();
  assert.equal(env.frames.size, 0);
});

test("stick clicks neutralize mapped values once without resetting position, heading or the other stick", () => {
  const env = environment(),
    input = create_controller_input(),
    mapped = create_flight_controls();
  const state = create_flight_state({
    ...FLYING_STATE,
    roll_deg: 25,
    pitch_deg: 10,
    camera_heading_deg: 40,
    camera_pitch_deg: -20,
  });
  let settings = DEFAULT_FLIGHT_CONTROL_SETTINGS;
  let changed;
  const unbind = bind_flight_controls(input, mapped, {
    read_settings: () => settings,
    subscribe_settings: (callback) => {
      changed = callback;
      return () => {};
    },
  });
  const stop = start_flight_simulation(state, mapped, env);
  input.update({ connected: true });
  const before = state.get_snapshot();
  input.request_stick_reset(1);
  const centered = state.get_snapshot();
  assert.deepEqual(centered, {
    ...before,
    camera_heading_deg: 0,
    camera_pitch_deg: 0,
  });
  state.update({ camera_heading_deg: 70, camera_pitch_deg: -10 });
  input.request_stick_reset(0);
  const stopped = state.get_snapshot();
  assert.equal(stopped.airspeed_knots, 0);
  assert.equal(stopped.roll_deg, 0);
  assert.equal(stopped.pitch_deg, 10);
  assert.equal(stopped.camera_heading_deg, 70);
  assert.equal(stopped.camera_pitch_deg, -10);
  assert.equal(stopped.vertical_speed_fpm, 0);
  assert.equal(stopped.turn_rate_deg_s, 0);
  for (const key of [
    "position_re",
    "position_im",
    "altitude_world",
    "heading_deg",
  ])
    assert.equal(stopped[key], before[key]);
  // A remapped right stick resets its assigned attitude channels instead of look.
  settings = normalize_flight_control_settings({
    axes: { right_x: "roll", right_y: "pitch" },
  });
  changed();
  state.update({ roll_deg: 20, pitch_deg: 15, camera_heading_deg: 60 });
  input.request_stick_reset(1);
  assert.equal(state.get_snapshot().roll_deg, 0);
  assert.equal(state.get_snapshot().pitch_deg, 0);
  assert.equal(state.get_snapshot().camera_heading_deg, 60);
  stop();
  state.update({ roll_deg: 20 });
  input.request_stick_reset(1);
  assert.equal(state.get_snapshot().roll_deg, 20);
  unbind();
});

test("blur, hidden documents, resumption and cleanup never integrate time spent away", () => {
  const env = environment(),
    state = create_flight_state(INITIAL_FLIGHT_STATE);
  const mapped = { get_snapshot: () => controls({ speed: 1 }) };
  const stop = start_flight_simulation(state, mapped, env);
  env.frame(0);
  env.frame(100);
  assert.equal(state.get_snapshot().airspeed_knots, 10);
  env.windowListeners.get("blur")();
  assert.equal(env.frames.size, 0);
  env.windowListeners.get("focus")();
  env.frame(10000);
  assert.equal(state.get_snapshot().airspeed_knots, 10);
  env.frame(10100);
  assert.equal(state.get_snapshot().airspeed_knots, 20);
  env.document.hidden = true;
  env.documentListeners.get("visibilitychange")();
  assert.equal(env.frames.size, 0);
  env.document.hidden = false;
  env.documentListeners.get("visibilitychange")();
  env.frame(50000);
  assert.equal(state.get_snapshot().airspeed_knots, 20);
  env.frame(50100);
  assert.equal(state.get_snapshot().airspeed_knots, 30);
  const late = env.frames.values().next().value;
  stop();
  stop();
  late(99999);
  assert.equal(state.get_snapshot().airspeed_knots, 30);
  assert.equal(env.frames.size, 0);
  assert.equal(env.windowListeners.size, 0);
  assert.equal(env.documentListeners.size, 0);
});
