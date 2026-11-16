export const CONTROL_BUTTONS = Object.freeze([
  "cross",
  "circle",
  "square",
  "triangle",
  "left_shoulder",
  "right_shoulder",
  "left_trigger",
  "right_trigger",
  "select",
  "start",
  "left_stick",
  "right_stick",
  "dpad_up",
  "dpad_down",
  "dpad_left",
  "dpad_right",
  "home",
  "touchpad",
]);
export const CONTROL_AXES = Object.freeze([
  "left_x",
  "left_y",
  "right_x",
  "right_y",
]);
export const CONTROL_CHANNELS = Object.freeze([
  "move_x",
  "move_y",
  "look_x",
  "look_y",
  "pitch",
  "roll",
  "yaw",
  "speed",
]);
export const CONTROL_ACTIONS = Object.freeze([
  "none",
  "confirm",
  "cancel",
  "interact",
  "change_view",
  "pause",
  "reset_view",
  "move",
  "look",
  "slow_down",
  "speed_up",
  "nose_down",
  "tail_up",
  "tilt_left",
  "tilt_right",
  "turn_left",
  "turn_right",
  "square",
  "triangle",
  "left_shoulder",
  "right_shoulder",
  "select",
  "start",
  "home",
  "touchpad",
]);
export const DEFAULT_FLIGHT_CONTROL_SETTINGS = Object.freeze({
  dead_zone: 0.2,
  sensitivity: 1,
  invert_pitch: false,
  axes: Object.freeze({
    left_x: "move_x",
    left_y: "move_y",
    right_x: "look_x",
    right_y: "look_y",
  }),
  axis_inverted: Object.freeze({
    left_x: false,
    left_y: true,
    right_x: false,
    right_y: true,
  }),
  buttons: Object.freeze(
    Object.fromEntries(
      CONTROL_BUTTONS.map((code, index) => [
        code,
        [
          "confirm",
          "cancel",
          "square",
          "triangle",
          "left_shoulder",
          "right_shoulder",
          "slow_down",
          "speed_up",
          "select",
          "start",
          "move",
          "look",
          "nose_down",
          "tail_up",
          "tilt_left",
          "tilt_right",
          "home",
          "touchpad",
        ][index],
      ]),
    ),
  ),
});

const bounded = (value, fallback, min, max) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

export function normalize_flight_control_settings(value) {
  const defaults = DEFAULT_FLIGHT_CONTROL_SETTINGS;
  return {
    dead_zone: bounded(value?.dead_zone, defaults.dead_zone, 0, 0.9),
    sensitivity: bounded(value?.sensitivity, defaults.sensitivity, 0.1, 3),
    invert_pitch:
      typeof value?.invert_pitch === "boolean"
        ? value.invert_pitch
        : defaults.invert_pitch,
    axes: Object.fromEntries(
      CONTROL_AXES.map((code) => [
        code,
        ["none", ...CONTROL_CHANNELS].includes(value?.axes?.[code])
          ? value.axes[code]
          : defaults.axes[code],
      ]),
    ),
    axis_inverted: Object.fromEntries(
      CONTROL_AXES.map((code) => [
        code,
        typeof value?.axis_inverted?.[code] === "boolean"
          ? value.axis_inverted[code]
          : defaults.axis_inverted[code],
      ]),
    ),
    buttons: Object.fromEntries(
      CONTROL_BUTTONS.map((code) => [
        code,
        CONTROL_ACTIONS.includes(value?.buttons?.[code])
          ? value.buttons[code]
          : defaults.buttons[code],
      ]),
    ),
  };
}
