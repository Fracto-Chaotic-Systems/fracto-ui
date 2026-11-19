import { create_controller_input } from "./ControllerInput.js";

export function mount_virtual_gamepad(
  host,
  { on_input, on_stick_reset = () => {} },
  dependencies,
) {
  const {
    GamepadEmulator,
    GamepadApiWrapper,
    setupPresetInteractiveGamepad,
    svg,
  } = dependencies;
  const { window, document, navigator } = dependencies.environment;
  const previous_emulation = Object.getOwnPropertyDescriptor(
    navigator,
    "gamepadInputEmulation",
  );
  const input = create_controller_input();
  const unsubscribe = input.subscribe(on_input);
  const active_pointers = new Map();
  let emulator;
  let wrapper;
  let display;
  let index;
  let destroyed = false;
  let connected = false;
  let shift_pressed = false;

  const publish = (gamepad_index, state) => {
    if (destroyed || gamepad_index !== index) return;
    input.update({
      connected: state?.connected,
      axis_scale: shift_pressed ? 1 : 0.25,
      axes: state?.axes,
      buttons: Array.from({ length: 18 }, (_, button_index) => {
        const button = state?.buttons?.[button_index];
        if (button_index < 12 || button_index > 15 || shift_pressed)
          return button;
        const amount = Number.isFinite(button?.value)
          ? Math.max(0, Math.min(1, button.value))
          : 0;
        return {
          value: (amount || (button?.pressed ? 1 : 0)) * 0.1,
          pressed: button?.pressed,
          touched: button?.touched,
        };
      }),
    });
  };
  const update_shift = (pressed) => {
    if (destroyed || shift_pressed === pressed) return;
    shift_pressed = pressed;
    if (connected) publish(index, navigator.getGamepads()[index]);
  };
  const key_changed = (event) => {
    if (typeof event.shiftKey === "boolean") update_shift(event.shiftKey);
  };
  const track_pointer = (event) => {
    key_changed(event);
    const id = event.target?.closest?.(
      "#stick_button_left_tap_target, #stick_button_right_tap_target",
    )?.id;
    active_pointers.set(event.pointerId, {
      target: event.target,
      stick:
        id === "stick_button_left_tap_target"
          ? 0
          : id === "stick_button_right_tap_target"
            ? 1
            : null,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    });
  };
  const track_motion = (event) => {
    const pointer = active_pointers.get(event.pointerId);
    if (
      pointer &&
      Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 6
    )
      pointer.moved = true;
  };
  const release_pointer = (event) => {
    track_motion(event);
    const pointer = active_pointers.get(event.pointerId);
    active_pointers.delete(event.pointerId);
    if (
      !pointer ||
      pointer.stick === null ||
      pointer.moved ||
      !Number.isFinite(pointer.x) ||
      !Number.isFinite(pointer.y) ||
      !Number.isFinite(event.clientX) ||
      !Number.isFinite(event.clientY)
    )
      return;
    for (const axis of [pointer.stick * 2, pointer.stick * 2 + 1])
      emulator.MoveAxis(index, axis, 0);
    emulator.PressButton(index, 10 + pointer.stick, 0, false);
    publish(index, navigator.getGamepads()[index]);
    on_stick_reset(pointer.stick);
  };
  const reset = () => {
    shift_pressed = false;
    if (destroyed || !connected) return;
    const pointers = [...active_pointers];
    active_pointers.clear();
    for (const [pointerId, { target }] of pointers) {
      target.dispatchEvent(
        new window.PointerEvent("pointerup", { pointerId, bubbles: true }),
      );
      if (target.hasPointerCapture?.(pointerId))
        target.releasePointerCapture(pointerId);
    }
    for (let button = 0; button < 18; button++)
      emulator.PressButton(index, button, 0, false);
    for (let axis = 0; axis < 4; axis++) emulator.MoveAxis(index, axis, 0);
    publish(index, navigator.getGamepads()[index]);
  };
  const visibility_changed = () => {
    if (document.hidden) reset();
  };
  const destroy = () => {
    if (destroyed) return;
    reset();
    destroyed = true;
    host.removeEventListener("pointerdown", track_pointer, true);
    host.removeEventListener("pointercancel", reset, true);
    document.removeEventListener("pointerup", release_pointer);
    document.removeEventListener("pointermove", track_motion, true);
    document.removeEventListener("visibilitychange", visibility_changed);
    window.removeEventListener("blur", reset);
    window.removeEventListener("keydown", key_changed);
    window.removeEventListener("keyup", key_changed);
    display?.Cleanup();
    wrapper?.cleanup();
    if (connected) emulator.RemoveEmulatedGamepad(index);
    emulator?.cleanup();
    if (previous_emulation)
      Object.defineProperty(
        navigator,
        "gamepadInputEmulation",
        previous_emulation,
      );
    else delete navigator.gamepadInputEmulation;
    input.reset();
    unsubscribe();
    host.replaceChildren();
    host.classList.remove("gpad-container");
  };

  try {
    const native_gamepads = navigator.getGamepads?.() ?? [];
    index = 0;
    while (native_gamepads[index]) index++;
    host.innerHTML = svg;
    emulator = new GamepadEmulator(0.1);
    wrapper = new GamepadApiWrapper({
      updateDelay: 0,
      axisDeadZone: 0.05,
      buttonConfigs: [],
    });
    host.addEventListener("pointerdown", track_pointer, true);
    host.addEventListener("pointercancel", reset, true);
    document.addEventListener("pointerup", release_pointer);
    document.addEventListener("pointermove", track_motion, true);
    document.addEventListener("visibilitychange", visibility_changed);
    window.addEventListener("blur", reset);
    window.addEventListener("keydown", key_changed);
    window.addEventListener("keyup", key_changed);
    const preset = setupPresetInteractiveGamepad(host, {
      GpadEmulator: emulator,
      GpadApiWrapper: wrapper,
      EmulatedGamepadIndex: index,
      EmulatedGamepadOverlayMode: false,
      GpadDisplayConfig: { gamepadIndex: index },
      AllowDpadDiagonals: true,
    });
    display = preset.gpadDisplay;
    connected = true;
    wrapper.onGamepadAxisChange(publish);
    wrapper.onGamepadButtonChange(publish);
    publish(index, navigator.getGamepads()[index]);
    return {
      get_snapshot: input.get_snapshot,
      subscribe: input.subscribe,
      reset,
      destroy,
    };
  } catch (error) {
    destroy();
    throw error;
  }
}
