import { create_controller_input } from "./ControllerInput.js";

export function mount_virtual_gamepad(host, { on_input }, dependencies) {
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

  const publish = (gamepad_index, state) => {
    if (!destroyed && gamepad_index === index) input.update(state);
  };
  const track_pointer = (event) => {
    active_pointers.set(event.pointerId, event.target);
  };
  const release_pointer = (event) => active_pointers.delete(event.pointerId);
  const reset = () => {
    if (destroyed || !connected) return;
    for (const [pointerId, target] of active_pointers) {
      target.dispatchEvent(
        new window.PointerEvent("pointerup", { pointerId, bubbles: true }),
      );
      if (target.hasPointerCapture?.(pointerId))
        target.releasePointerCapture(pointerId);
    }
    active_pointers.clear();
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
    document.removeEventListener("visibilitychange", visibility_changed);
    window.removeEventListener("blur", reset);
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
    document.addEventListener("visibilitychange", visibility_changed);
    window.addEventListener("blur", reset);
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
