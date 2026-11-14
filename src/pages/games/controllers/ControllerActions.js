const BUTTON_ACTIONS = [
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
];

// Standard gamepad indices only; no dependence on the on-screen controller vendor.
export function controller_action_codes(state) {
  if (!state?.connected) return [];
  const actions = BUTTON_ACTIONS.filter(
    (_, index) => state.buttons?.[index]?.pressed,
  );
  for (const [side, offset] of [
    ["left", 0],
    ["right", 2],
  ]) {
    const x = state.axes?.[offset] ?? 0;
    const y = state.axes?.[offset + 1] ?? 0;
    if (x < -0.2) actions.push(`${side}_turn_left`);
    if (x > 0.2) actions.push(`${side}_turn_right`);
    if (y < -0.2) actions.push(`${side}_forward`);
    if (y > 0.2) actions.push(`${side}_backward`);
  }
  return actions;
}
