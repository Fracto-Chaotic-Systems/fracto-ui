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
const close = (actual, expected, tolerance = 1e-8) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${actual} != ${expected}`,
  );

test("mapped pitch, roll, speed and yaw update consistent live instrument readings", () => {
  const next = step_flight_state(
    INITIAL_FLIGHT_STATE,
    controls({ pitch: 1, roll: 1, speed: 1, yaw: 0.5 }),
    0.1,
  );
  assert.equal(next.source, "live");
  close(next.pitch_deg, 2);
  close(next.roll_deg, 4);
  close(next.airspeed_knots, 91);
  assert.ok(next.altitude_ft > 2500);
  assert.ok(next.vertical_speed_fpm > 0);
  assert.ok(next.heading_deg > 45);
  assert.ok(next.turn_rate_deg_s > 0);
  assert.equal(next.slip, 0.5);
  assert.equal(INITIAL_FLIGHT_STATE.pitch_deg, 0);
});

test("default movement banks and changes speed while look input leaves aircraft attitude alone", () => {
  const moved = step_flight_state(
    INITIAL_FLIGHT_STATE,
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
  assert.deepEqual(looked, INITIAL_FLIGHT_STATE);
});

test("release holds speed and attitude while existing bank and pitch continue the flight", () => {
  const flying = { ...INITIAL_FLIGHT_STATE, pitch_deg: 10, roll_deg: 20 };
  const next = step_flight_state(flying, controls({}), 0.1);
  assert.equal(next.pitch_deg, 10);
  assert.equal(next.roll_deg, 20);
  assert.equal(next.airspeed_knots, 90);
  assert.ok(next.altitude_ft > 2500);
  assert.ok(next.heading_deg > 45);
});

test("zero speed, ground, envelope bounds, heading wrap and elapsed-time limits stay finite", () => {
  const grounded = step_flight_state(
    {
      ...INITIAL_FLIGHT_STATE,
      airspeed_knots: 0,
      altitude_ft: 0,
      pitch_deg: -10,
      roll_deg: 60,
    },
    controls({ speed: -1 }),
    0.1,
  );
  assert.equal(grounded.airspeed_knots, 0);
  assert.equal(grounded.altitude_ft, 0);
  assert.equal(grounded.vertical_speed_fpm, 0);
  assert.equal(grounded.turn_rate_deg_s, 0);
  const bounded = step_flight_state(
    {
      ...INITIAL_FLIGHT_STATE,
      pitch_deg: 30,
      roll_deg: 60,
      airspeed_knots: 300,
      heading_deg: 359.9,
    },
    controls({ pitch: 1, roll: 1, speed: 1, yaw: 1 }),
    0.1,
  );
  assert.equal(bounded.pitch_deg, 30);
  assert.equal(bounded.roll_deg, 60);
  assert.equal(bounded.airspeed_knots, 300);
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
    let state = INITIAL_FLIGHT_STATE;
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
  for (const key of [
    "pitch_deg",
    "roll_deg",
    "airspeed_knots",
    "vertical_speed_fpm",
  ])
    close(slow[key], fast[key], 1e-6);
  close(slow.heading_deg, fast.heading_deg, 0.01);
  close(slow.altitude_ft, fast.altitude_ft, 0.1);
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
  close(state.get_snapshot().airspeed_knots, 90.5);
  buttons[7] = { value: 0 };
  buttons[12] = { pressed: true };
  input.update({ connected: true, buttons });
  env.frame(200);
  assert.equal(state.get_snapshot().pitch_deg, -2);
  settings = normalize_flight_control_settings({ invert_pitch: true });
  changed();
  env.frame(300);
  assert.equal(state.get_snapshot().pitch_deg, 0);
  input.reset();
  const disconnected = state.get_snapshot();
  env.frame(400);
  assert.deepEqual(state.get_snapshot(), disconnected);
  stop();
  unbind();
  assert.equal(env.frames.size, 0);
});

test("blur, hidden documents, resumption and cleanup never integrate time spent away", () => {
  const env = environment(),
    state = create_flight_state(INITIAL_FLIGHT_STATE);
  const mapped = { get_snapshot: () => controls({ speed: 1 }) };
  const stop = start_flight_simulation(state, mapped, env);
  env.frame(0);
  env.frame(100);
  assert.equal(state.get_snapshot().airspeed_knots, 91);
  env.windowListeners.get("blur")();
  assert.equal(env.frames.size, 0);
  env.windowListeners.get("focus")();
  env.frame(10000);
  assert.equal(state.get_snapshot().airspeed_knots, 91);
  env.frame(10100);
  assert.equal(state.get_snapshot().airspeed_knots, 92);
  env.document.hidden = true;
  env.documentListeners.get("visibilitychange")();
  assert.equal(env.frames.size, 0);
  env.document.hidden = false;
  env.documentListeners.get("visibilitychange")();
  env.frame(50000);
  assert.equal(state.get_snapshot().airspeed_knots, 92);
  env.frame(50100);
  assert.equal(state.get_snapshot().airspeed_knots, 93);
  const late = env.frames.values().next().value;
  stop();
  stop();
  late(99999);
  assert.equal(state.get_snapshot().airspeed_knots, 93);
  assert.equal(env.frames.size, 0);
  assert.equal(env.windowListeners.size, 0);
  assert.equal(env.documentListeners.size, 0);
});
