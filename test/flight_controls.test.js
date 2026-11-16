import assert from "node:assert/strict";
import test from "node:test";
import { create_controller_input } from "../src/pages/games/controllers/ControllerInput.js";
import {
  DEFAULT_FLIGHT_CONTROL_SETTINGS,
  normalize_flight_control_settings,
} from "../src/pages/games/controllers/FlightControlSettings.js";
import {
  map_flight_controls,
  apply_axis_response,
} from "../src/pages/games/controllers/FlightControlMapping.js";
import {
  create_flight_controls,
  bind_flight_controls,
} from "../src/pages/games/controllers/FlightControls.js";
import { controller_action_codes } from "../src/pages/games/controllers/ControllerActions.js";

const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test("default sticks produce proportional movement/view commands and one help action per stick", () => {
  const output = map_flight_controls({
    connected: true,
    axes: [0.6, -0.6, -0.6, -0.6],
  });
  close(output.move_x, 0.5);
  close(output.move_y, 0.5);
  close(output.look_x, -0.5);
  close(output.look_y, 0.5);
  assert.deepEqual(output.actions, ["move", "look"]);
  assert.ok(Object.isFrozen(output));
  assert.ok(Object.isFrozen(output.actions));
  assert.ok(Object.isFrozen(output.action_values));
});

test("dead zone rescales continuously, sensitivity saturates, and malformed axes are neutral", () => {
  const settings = normalize_flight_control_settings({
    dead_zone: 0.4,
    sensitivity: 2,
  });
  assert.equal(apply_axis_response(0.4, settings), 0);
  assert.equal(apply_axis_response(-0.3, settings), 0);
  close(apply_axis_response(0.55, settings), 0.5);
  assert.equal(apply_axis_response(-1, settings), -1);
  for (const value of [NaN, Infinity, undefined, "1"])
    assert.equal(apply_axis_response(value, settings), 0);
  assert.deepEqual(
    map_flight_controls({ connected: true, axes: [0.2, -0.2, 0, 0] }).actions,
    [],
  );
});

test("button reassignment and unassignment drive both effective commands and help", () => {
  const settings = normalize_flight_control_settings({
    buttons: { cross: "speed_up", circle: "none" },
  });
  const state = {
    connected: true,
    buttons: [{ pressed: true }, { pressed: true }],
  };
  const output = map_flight_controls(state, settings);
  assert.equal(output.speed, 1);
  assert.deepEqual(output.actions, ["speed_up"]);
  assert.deepEqual(controller_action_codes(state, settings), ["speed_up"]);
  assert.equal(DEFAULT_FLIGHT_CONTROL_SETTINGS.buttons.cross, "confirm");
});

test("analog triggers retain fractional amounts and opposing signals cancel", () => {
  const buttons = Array.from({ length: 18 }, () => ({
    value: 0,
    pressed: false,
  }));
  buttons[6] = { value: 0.25 };
  buttons[7] = { value: 0.8 };
  const output = map_flight_controls({ connected: true, buttons });
  close(output.speed, 0.55);
  assert.equal(output.action_values.slow_down, 0.25);
  assert.equal(output.action_values.speed_up, 0.8);
  buttons[6] = { value: 1 };
  buttons[7] = { value: 1 };
  assert.equal(map_flight_controls({ connected: true, buttons }).speed, 0);
});

test("axis assignment and pitch inversion keep effective pitch and help direction synchronized", () => {
  const state = { connected: true, axes: [0, -0.6, 0, 0] };
  const normal = normalize_flight_control_settings({
    axes: { left_y: "pitch" },
  });
  close(map_flight_controls(state, normal).pitch, 0.5);
  assert.deepEqual(map_flight_controls(state, normal).actions, ["tail_up"]);
  const inverted = normalize_flight_control_settings({
    ...normal,
    invert_pitch: true,
  });
  close(map_flight_controls(state, inverted).pitch, -0.5);
  assert.deepEqual(controller_action_codes(state, inverted), ["nose_down"]);
  const buttonSettings = normalize_flight_control_settings({
    invert_pitch: true,
    buttons: { cross: "nose_down" },
  });
  const buttonOutput = map_flight_controls(
    { connected: true, buttons: [{ pressed: true }] },
    buttonSettings,
  );
  assert.equal(buttonOutput.pitch, 1);
  assert.deepEqual(buttonOutput.actions, ["tail_up"]);
  const unassigned = normalize_flight_control_settings({
    axes: { left_y: "none" },
  });
  assert.deepEqual(controller_action_codes(state, unassigned), []);
});

test("malformed saved preferences recover defaults and bound response settings", () => {
  assert.deepEqual(
    normalize_flight_control_settings(null),
    DEFAULT_FLIGHT_CONTROL_SETTINGS,
  );
  const settings = normalize_flight_control_settings({
    dead_zone: 1,
    sensitivity: -5,
    invert_pitch: "true",
    axes: { left_x: "bad", right_y: "pitch" },
    axis_inverted: { left_y: "yes" },
    buttons: { cross: "bad", circle: "none", unknown: "cancel" },
  });
  assert.equal(settings.dead_zone, 0.9);
  assert.equal(settings.sensitivity, 0.1);
  assert.equal(settings.invert_pitch, false);
  assert.equal(settings.axes.left_x, "move_x");
  assert.equal(settings.axes.right_y, "pitch");
  assert.equal(settings.axis_inverted.left_y, true);
  assert.equal(settings.buttons.cross, "confirm");
  assert.equal(settings.buttons.circle, "none");
  assert.equal(Object.keys(settings.buttons).length, 18);
});

test("live binding recomputes held input on preference edits and clears on reset/disconnect", () => {
  const input = create_controller_input();
  const controls = create_flight_controls();
  const settingsListeners = new Set();
  let preferences = DEFAULT_FLIGHT_CONTROL_SETTINGS;
  let notifications = 0;
  const unsubscribe = controls.subscribe(() => notifications++);
  const stop = bind_flight_controls(input, controls, {
    read_settings: () => preferences,
    subscribe_settings: (callback) => {
      settingsListeners.add(callback);
      return () => settingsListeners.delete(callback);
    },
  });
  input.update({ connected: true, buttons: [{ pressed: true }] });
  const first = controls.get_snapshot();
  assert.deepEqual(first.actions, ["confirm"]);
  preferences = normalize_flight_control_settings({
    buttons: { cross: "cancel" },
  });
  settingsListeners.forEach((callback) => callback());
  assert.deepEqual(controls.get_snapshot().actions, ["cancel"]);
  assert.deepEqual(first.actions, ["confirm"]);
  const count = notifications;
  settingsListeners.forEach((callback) => callback());
  assert.equal(notifications, count);
  input.reset();
  assert.equal(controls.get_snapshot().connected, false);
  assert.deepEqual(controls.get_snapshot().actions, []);
  input.update({ connected: true, axes: [1, 0, 0, 0] });
  assert.equal(controls.get_snapshot().move_x, 1);
  stop();
  stop();
  assert.equal(settingsListeners.size, 0);
  assert.equal(controls.get_snapshot().move_x, 0);
  const stopped = controls.get_snapshot();
  input.update({ connected: true, axes: [0, 1, 0, 0] });
  assert.strictEqual(controls.get_snapshot(), stopped);
  unsubscribe();
});

test("disconnected input and repeated sessions cannot retain commands", () => {
  const controls = create_flight_controls();
  controls.update({ connected: true, axes: [1, 1, 1, 1] });
  controls.update({
    connected: false,
    axes: [1, 1, 1, 1],
    buttons: [{ pressed: true }],
  });
  const state = controls.get_snapshot();
  assert.deepEqual(state.actions, []);
  for (const code of [
    "move_x",
    "move_y",
    "look_x",
    "look_y",
    "pitch",
    "roll",
    "yaw",
    "speed",
  ])
    assert.equal(state[code], 0);
});
