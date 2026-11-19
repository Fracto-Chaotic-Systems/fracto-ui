import assert from "node:assert/strict";
import test from "node:test";
import {
  create_controller_input,
  normalize_controller_state,
} from "../src/pages/games/controllers/ControllerInput.js";
import { mount_virtual_gamepad } from "../src/pages/games/controllers/VirtualGamepadRuntime.js";
import { start_controller_session } from "../src/pages/games/controllers/ControllerSession.js";
import { controller_action_codes } from "../src/pages/games/controllers/ControllerActions.js";
import { map_flight_controls } from "../src/pages/games/controllers/FlightControlMapping.js";
import {
  CONTROLLER_COLORS,
  controller_color_style,
} from "../src/pages/games/controllers/ControllerColors.js";

test("every handle palette supplies distinct shading and unsupported colors retain blue", () => {
  assert.equal(CONTROLLER_COLORS.length, 10);
  const palettes = CONTROLLER_COLORS.map(controller_color_style);
  assert.equal(
    new Set(palettes.map((palette) => palette["--controller-shell-2"])).size,
    10,
  );
  for (const palette of palettes) {
    assert.match(palette["--controller-highlight"], /^#[0-9a-f]{6}$/);
    assert.notEqual(
      palette["--controller-shell-0"],
      palette["--controller-shell-4"],
    );
  }
  assert.deepEqual(
    controller_color_style("unknown"),
    controller_color_style("blue"),
  );
});

test("action descriptions combine stick directions and presses into one label per stick", () => {
  const input = create_controller_input();
  const buttons = Array.from({ length: 18 }, () => ({ pressed: false }));
  buttons[6] = { pressed: true, value: 1 };
  buttons[9] = { pressed: true, value: 1 };
  input.update({ connected: true, buttons, axes: [-0.8, 0.9, 0.8, -0.9] });
  assert.deepEqual(controller_action_codes(input.get_snapshot()), [
    "slow_down",
    "start",
    "move",
    "look",
  ]);
  buttons[10] = { pressed: true, value: 1 };
  buttons[11] = { pressed: true, value: 1 };
  input.update({ connected: true, buttons, axes: [-0.8, 0.9, 0.8, -0.9] });
  assert.deepEqual(controller_action_codes(input.get_snapshot()), [
    "slow_down",
    "start",
    "move",
    "look",
  ]);
  input.update({ connected: true, axes: [0.2, -0.2, 0, 0], buttons: [] });
  assert.deepEqual(controller_action_codes(input.get_snapshot()), []);
  input.reset();
  assert.deepEqual(controller_action_codes(input.get_snapshot()), []);
});

test("action descriptions cover every standard button and clear on disconnect", () => {
  const state = normalize_controller_state({
    connected: true,
    buttons: Array.from({ length: 18 }, () => ({ pressed: true, value: 1 })),
  });
  const codes = controller_action_codes(state);
  assert.equal(codes.length, 18);
  assert.equal(new Set(codes).size, 18);
  assert.ok(codes.includes("speed_up"));
  assert.ok(codes.includes("tilt_left"));
  assert.deepEqual(controller_action_codes({ ...state, connected: false }), []);
});

test("a provider resolving after cancellation never mounts", async () => {
  let resolve;
  const load = new Promise((done) => {
    resolve = done;
  });
  let mounts = 0;
  const session = start_controller_session(
    () => load,
    {},
    {
      on_input() {},
      on_ready() {},
      on_error() {
        assert.fail("cancelled load reported error");
      },
    },
  );
  session.destroy();
  resolve(() => {
    mounts++;
  });
  await session.ready;
  assert.equal(mounts, 0);
});

test("provider sessions dispose exactly once and report load failure", async () => {
  let destroyed = 0;
  let errors = 0;
  const options = {
    on_input() {},
    on_ready() {},
    on_error() {
      errors++;
    },
  };
  const session = start_controller_session(
    async () => () => ({
      destroy() {
        destroyed++;
      },
    }),
    {},
    options,
  );
  await session.ready;
  session.destroy();
  session.destroy();
  assert.equal(destroyed, 1);
  const failed = start_controller_session(
    async () => {
      throw new Error("unavailable");
    },
    {},
    options,
  );
  await failed.ready;
  assert.equal(errors, 1);
});

test("controller snapshots have fixed standard controls, bounded values, and no vendor fields", () => {
  const source = {
    connected: true,
    id: "vendor identifier",
    index: 99,
    axes: [2, -2, NaN, 0.5, 42],
    buttons: [{ value: 2, pressed: true, touched: true }, { value: -1 }],
  };
  const state = normalize_controller_state(source);
  assert.deepEqual(Object.keys(state), [
    "connected",
    "axis_scale",
    "axes",
    "buttons",
  ]);
  assert.equal(state.axis_scale, 1);
  assert.deepEqual(state.axes, [1, -1, 0, 0.5]);
  assert.equal(state.buttons.length, 18);
  assert.equal(state.buttons[0].value, 1);
  assert.equal(state.buttons[1].value, 0);
  assert.ok(Object.isFrozen(state.buttons[0]));
  source.axes[3] = 0;
  assert.equal(state.axes[3], 0.5);
});

test("input subscribers receive changes and disconnect clears held input", () => {
  const input = create_controller_input();
  const updates = [];
  const off = input.subscribe((state) => updates.push(state));
  const state = {
    connected: true,
    axes: [1],
    buttons: [{ value: 1, pressed: true }],
  };
  input.update(state);
  input.update(state);
  assert.equal(updates.length, 1);
  input.reset();
  assert.equal(input.get_snapshot().connected, false);
  assert.equal(input.get_snapshot().axes[0], 0);
  assert.equal(input.get_snapshot().buttons[0].pressed, false);
  off();
  input.update(state);
  assert.equal(updates.length, 2);
});

function harness({ fail = false } = {}) {
  const window = new EventTarget();
  window.PointerEvent = class extends Event {
    constructor(type, options) {
      super(type, options);
      this.pointerId = options.pointerId;
    }
  };
  const document = new EventTarget();
  document.hidden = false;
  const host = new EventTarget();
  host.closest = () => host.stick_target ?? null;
  host.innerHTML = "";
  host.classList = { remove() {} };
  host.replaceChildren = () => {
    host.innerHTML = "";
  };
  const physical = { connected: true, axes: [0.5], buttons: [] };
  const native_get = () => [physical];
  const navigator = { getGamepads: native_get };
  const pads = [physical];
  const calls = {
    cleanup: 0,
    wrapper_cleanup: 0,
    display_cleanup: 0,
    remove: 0,
  };
  let config;
  let wrapper;
  class Emulator {
    constructor() {
      navigator.getGamepads = () => pads;
    }
    PressButton(index, button, value, touched) {
      pads[index].buttons[button] = { value, touched, pressed: value > 0.1 };
    }
    MoveAxis(index, axis, value) {
      pads[index].axes[axis] = value;
    }
    RemoveEmulatedGamepad(index) {
      pads[index] = null;
      calls.remove++;
    }
    cleanup() {
      navigator.getGamepads = native_get;
      calls.cleanup++;
    }
  }
  class Wrapper {
    constructor() {
      wrapper = this;
      navigator.gamepadInputEmulation = "gamepad";
    }
    onGamepadAxisChange(fn) {
      this.axes = fn;
    }
    onGamepadButtonChange(fn) {
      this.buttons = fn;
    }
    cleanup() {
      calls.wrapper_cleanup++;
    }
  }
  const on_input = [];
  const stick_resets = [];
  const dependencies = {
    GamepadEmulator: Emulator,
    GamepadApiWrapper: Wrapper,
    svg: "<svg></svg>",
    environment: { window, document, navigator },
    setupPresetInteractiveGamepad(_, options) {
      config = options;
      if (fail) throw new Error("preset failed");
      pads[options.EmulatedGamepadIndex] = {
        connected: true,
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 18 }, () => ({
          value: 0,
          pressed: false,
          touched: false,
        })),
      };
      return {
        gpadDisplay: {
          Cleanup() {
            calls.display_cleanup++;
          },
        },
      };
    },
  };
  return {
    mount: () =>
      mount_virtual_gamepad(
        host,
        {
          on_input: (state) => on_input.push(state),
          on_stick_reset: (stick) => stick_resets.push(stick),
        },
        dependencies,
      ),
    window,
    document,
    host,
    navigator,
    native_get,
    pads,
    calls,
    on_input,
    stick_resets,
    get config() {
      return config;
    },
    get wrapper() {
      return wrapper;
    },
  };
}

test("adapter avoids physical controllers, publishes virtual input, and resets on blur", () => {
  const env = harness();
  const adapter = env.mount();
  assert.equal(env.config.EmulatedGamepadIndex, 1);
  assert.equal(env.config.EmulatedGamepadOverlayMode, false);
  assert.equal(env.config.GpadDisplayConfig.gamepadIndex, 1);
  env.pads[1].axes[0] = -0.75;
  env.wrapper.axes(1, env.pads[1]);
  assert.equal(adapter.get_snapshot().axes[0], -0.75);
  env.wrapper.axes(0, env.pads[0]);
  assert.equal(adapter.get_snapshot().axes[0], -0.75);
  env.window.dispatchEvent(new Event("blur"));
  assert.equal(adapter.get_snapshot().axes[0], 0);
  adapter.destroy();
  adapter.destroy();
  assert.equal(env.navigator.getGamepads, env.native_get);
  assert.equal("gamepadInputEmulation" in env.navigator, false);
  assert.equal(adapter.get_snapshot().connected, false);
  assert.equal(env.host.innerHTML, "");
  assert.deepEqual(env.calls, {
    cleanup: 1,
    wrapper_cleanup: 1,
    display_cleanup: 1,
    remove: 1,
  });
});

test("d-pad uses fine input by default and Shift changes held directions immediately", () => {
  const env = harness();
  const adapter = env.mount();
  const pad = env.pads[1];
  const key = (type, shiftKey) => {
    const event = new Event(type);
    Object.assign(event, { shiftKey });
    env.window.dispatchEvent(event);
  };
  pad.buttons[12] = { value: 1, pressed: true, touched: true };
  pad.buttons[15] = { value: 1, pressed: true };
  pad.buttons[7] = { value: 1, pressed: true };
  pad.axes[0] = 0.6;
  env.wrapper.buttons(1, pad);
  const mapped = () => map_flight_controls(adapter.get_snapshot());
  assert.equal(mapped().pitch, -0.1);
  assert.equal(mapped().roll, 0.1);
  assert.equal(mapped().speed, 1);
  assert.equal(adapter.get_snapshot().axes[0], 0.6);
  assert.equal(adapter.get_snapshot().buttons[12].pressed, true);
  assert.equal(adapter.get_snapshot().buttons[12].touched, true);
  assert.equal(pad.buttons[12].value, 1);
  key("keydown", true);
  assert.equal(mapped().pitch, -1);
  key("keyup", false);
  assert.equal(mapped().pitch, -0.1);
  pad.buttons[13] = { value: 1, pressed: true };
  env.wrapper.buttons(1, pad);
  assert.equal(mapped().pitch, 0);
  adapter.destroy();
});

test("all d-pad directions support subtle analog values, Shift on pointer down and blur reset", () => {
  const env = harness();
  const adapter = env.mount();
  const pad = env.pads[1];
  for (const button of [12, 13, 14, 15]) {
    pad.buttons[button] = { value: 0.5, pressed: true };
    env.wrapper.buttons(1, pad);
    assert.equal(adapter.get_snapshot().buttons[button].value, 0.05);
  }
  const pointer = new Event("pointerdown");
  Object.assign(pointer, { pointerId: 7, shiftKey: true });
  env.host.dispatchEvent(pointer);
  for (const button of [12, 13, 14, 15])
    assert.equal(adapter.get_snapshot().buttons[button].value, 0.5);
  env.window.dispatchEvent(new Event("blur"));
  assert.ok(
    adapter.get_snapshot().buttons.every((button) => button.value === 0),
  );
  pad.buttons[12] = { pressed: true };
  env.wrapper.buttons(1, pad);
  assert.equal(adapter.get_snapshot().buttons[12].value, 0.1);
  adapter.destroy();
});

test("both joysticks use quarter strength after dead zones and Shift restores held axes", () => {
  const env = harness();
  const adapter = env.mount();
  const pad = env.pads[1];
  pad.axes = [1, -1, -1, 1];
  env.wrapper.axes(1, pad);
  const mapped = () => map_flight_controls(adapter.get_snapshot());
  assert.equal(mapped().move_x, 0.25);
  assert.equal(mapped().move_y, 0.25);
  assert.equal(mapped().look_x, -0.25);
  assert.equal(mapped().look_y, -0.25);
  assert.deepEqual(adapter.get_snapshot().axes, pad.axes);
  const key = (type, shiftKey) => {
    const event = new Event(type);
    Object.assign(event, { shiftKey });
    env.window.dispatchEvent(event);
  };
  key("keydown", true);
  assert.equal(mapped().move_x, 1);
  assert.equal(mapped().move_y, 1);
  assert.equal(mapped().look_x, -1);
  assert.equal(mapped().look_y, -1);
  key("keyup", false);
  assert.equal(mapped().look_x, -0.25);
  pad.axes = [0.3, 0.2, 0.6, -0.6];
  env.wrapper.axes(1, pad);
  assert.ok(mapped().move_x > 0);
  assert.equal(mapped().move_y, 0);
  assert.ok(Math.abs(mapped().look_x - 0.125) < 1e-10);
  key("keydown", true);
  env.window.dispatchEvent(new Event("blur"));
  assert.ok(adapter.get_snapshot().axes.every((value) => value === 0));
  pad.axes = [1, 0, 0, 0];
  env.wrapper.axes(1, pad);
  assert.equal(mapped().move_x, 0.25);
  adapter.destroy();
});

test("a stick tap resets only its axes and emits one reset; dragging out and back does not", () => {
  const env = harness();
  const adapter = env.mount();
  const pad = env.pads[1];
  const pointer = (target, type, id, x, y) => {
    const event = new Event(type);
    Object.assign(event, { pointerId: id, clientX: x, clientY: y });
    target.dispatchEvent(event);
  };
  env.host.stick_target = { id: "stick_button_left_tap_target" };
  pad.axes = [1, 1, 0.7, -0.8];
  pointer(env.host, "pointerdown", 1, 30, 40);
  pointer(env.document, "pointerup", 1, 32, 42);
  assert.deepEqual(env.stick_resets, [0]);
  assert.deepEqual(adapter.get_snapshot().axes, [0, 0, 0.7, -0.8]);
  env.host.stick_target = { id: "stick_button_right_tap_target" };
  pointer(env.host, "pointerdown", 2, 30, 40);
  pointer(env.document, "pointermove", 2, 50, 40);
  pointer(env.document, "pointerup", 2, 30, 40);
  assert.deepEqual(env.stick_resets, [0]);
  pointer(env.host, "pointerdown", 3, 30, 40);
  pointer(env.document, "pointerup", 3, 30, 40);
  assert.deepEqual(env.stick_resets, [0, 1]);
  assert.deepEqual(adapter.get_snapshot().axes, [0, 0, 0, 0]);
  adapter.destroy();
});

test("cancelled gestures and lifecycle resets never neutralize accumulated flight values", () => {
  const env = harness();
  const adapter = env.mount();
  env.host.stick_target = { id: "stick_button_right_tap_target" };
  const start = () => {
    const event = new Event("pointerdown");
    Object.assign(event, { pointerId: 1, clientX: 0, clientY: 0 });
    env.host.dispatchEvent(event);
  };
  start();
  env.host.dispatchEvent(new Event("pointercancel"));
  start();
  env.window.dispatchEvent(new Event("blur"));
  start();
  adapter.destroy();
  assert.deepEqual(env.stick_resets, []);
});

test("hidden pages and pointer cancellation release controls; failed mounts restore the API", () => {
  const env = harness();
  const adapter = env.mount();
  env.pads[1].buttons[0] = { value: 1, pressed: true, touched: true };
  env.wrapper.buttons(1, env.pads[1]);
  env.document.hidden = true;
  env.document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(adapter.get_snapshot().buttons[0].pressed, false);
  env.pads[1].axes[0] = 1;
  env.host.dispatchEvent(new Event("pointercancel"));
  assert.equal(adapter.get_snapshot().axes[0], 0);
  adapter.destroy();
  const broken = harness({ fail: true });
  assert.throws(() => broken.mount(), /preset failed/);
  assert.equal(broken.navigator.getGamepads, broken.native_get);
  assert.equal(broken.calls.wrapper_cleanup, 1);
  assert.equal(broken.calls.cleanup, 1);
  assert.equal(broken.host.innerHTML, "");
});
