import {
  CONTROL_AXES,
  CONTROL_BUTTONS,
  CONTROL_CHANNELS,
  DEFAULT_FLIGHT_CONTROL_SETTINGS,
} from "./FlightControlSettings.js";

const clamp = (value) =>
  Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));
const DIRECT_ACTIONS = {
  slow_down: ["speed", -1],
  speed_up: ["speed", 1],
  nose_down: ["pitch", -1],
  tail_up: ["pitch", 1],
  tilt_left: ["roll", -1],
  tilt_right: ["roll", 1],
  turn_left: ["yaw", -1],
  turn_right: ["yaw", 1],
};

export function apply_axis_response(value, settings) {
  const input = clamp(value);
  if (Math.abs(input) <= settings.dead_zone) return 0;
  return clamp(
    ((Math.sign(input) * (Math.abs(input) - settings.dead_zone)) /
      (1 - settings.dead_zone)) *
      settings.sensitivity,
  );
}

// Positive channels: rightward movement/look, forward movement, upward look,
// positive pitch, right roll/yaw, and increasing speed. This produces intent,
// not attitude, position, velocity, or a time-integrated physics result.
export function map_flight_controls(
  state,
  settings = DEFAULT_FLIGHT_CONTROL_SETTINGS,
) {
  const channels = Object.fromEntries(
    CONTROL_CHANNELS.map((code) => [code, 0]),
  );
  const levels = {};
  const action = (code, amount) => {
    if (code !== "none" && amount > 0)
      levels[code] = Math.max(levels[code] ?? 0, amount);
  };
  const signal = (channel, value) => {
    if (!value || !CONTROL_CHANNELS.includes(channel)) return;
    const amount =
      channel === "pitch" && settings.invert_pitch ? -value : value;
    channels[channel] += amount;
    if (channel.startsWith("move_")) action("move", Math.abs(amount));
    else if (channel.startsWith("look_")) action("look", Math.abs(amount));
    else
      action(
        {
          pitch: amount > 0 ? "tail_up" : "nose_down",
          roll: amount > 0 ? "tilt_right" : "tilt_left",
          yaw: amount > 0 ? "turn_right" : "turn_left",
          speed: amount > 0 ? "speed_up" : "slow_down",
        }[channel],
        Math.abs(amount),
      );
  };
  if (state?.connected) {
    CONTROL_BUTTONS.forEach((code, index) => {
      const button = state.buttons?.[index];
      const amount =
        Math.max(0, clamp(button?.value)) || (button?.pressed ? 1 : 0);
      if (!amount) return;
      const target = settings.buttons[code];
      const direct = DIRECT_ACTIONS[target];
      if (direct) signal(direct[0], amount * direct[1]);
      else action(target, amount);
    });
    CONTROL_AXES.forEach((code, index) => {
      const value =
        apply_axis_response(state.axes?.[index], settings) *
        (settings.axis_inverted[code] ? -1 : 1);
      signal(settings.axes[code], value);
    });
  }
  return Object.freeze({
    connected: !!state?.connected,
    ...Object.fromEntries(
      Object.entries(channels).map(([code, value]) => [code, clamp(value)]),
    ),
    actions: Object.freeze(Object.keys(levels)),
    action_values: Object.freeze(levels),
  });
}
