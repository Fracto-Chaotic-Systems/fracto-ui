import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import {
  CONTROLLER_COLORS,
  normalize_controller_color,
} from "../src/pages/games/controllers/ControllerColors.js";

const source = readFileSync(
  new URL("../src/pages/games/GamesPlaySettings.jsx", import.meta.url),
  "utf8",
)
  .replace(/^import[\s\S]*?;\r?\n/gm, "")
  .replace("export default function", "function");
const code = transformSync(source, { loader: "jsx" }).code;

function mount({
  reject = false,
  supported = true,
  controller = "on_screen",
  controller_actions = false,
  controller_color = "blue",
} = {}) {
  const states = [];
  const effects = [];
  const listeners = new Map();
  const saved = [];
  let cursor = 0;
  let requests = 0;
  let exits = 0;
  const document = {
    fullscreenEnabled: supported,
    fullscreenElement: null,
    documentElement: {},
    async exitFullscreen() {
      exits++;
      document.fullscreenElement = null;
      listeners.get("fullscreenchange")?.();
    },
    addEventListener: (type, handler) => listeners.set(type, handler),
    removeEventListener: (type) => listeners.delete(type),
  };
  const game_area = {
    async requestFullscreen() {
      requests++;
      if (reject) throw new Error("Fullscreen denied");
      document.fullscreenElement = game_area;
      listeners.get("fullscreenchange")?.();
    },
  };
  const fullscreen_target_ref = { current: game_area };
  const component = vm.runInNewContext(code + ";GamesPlaySettings", {
    FlightInstrumentSettingsPanel: () => null,
    FlightControlSettingsPanel: () => null,
    FLIGHT_SETTINGS_TEXT: { instruments: "instruments" },
    React: {
      createElement: (type, props, ...children) => ({ type, props, children }),
    },
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) {
        states[index] = typeof initial === "function" ? initial() : initial;
      }
      return [states[index], (value) => (states[index] = value)];
    },
    useEffect: (effect) => effects.push(effect),
    styled: { details: () => "details", label: () => "label" },
    Switch: "switch",
    AppText: { get: (key) => key },
    AppSettings: {
      get: (key) =>
        key === "controller_color"
          ? controller_color
          : key === "controller_actions"
            ? controller_actions
            : controller,
      on_settings_changed: (value) => saved.push(value),
    },
    KEY_GAMES_PLAY_FULL_SCREEN: "fullscreen",
    KEY_GAMES_PLAY_DISPLAY: "display",
    KEY_GAMES_PLAY_CONTROLLERS: "control",
    KEY_GAMES_PLAY_CONTROLLER: "controller",
    KEY_GAMES_PLAY_CONTROLLER_ACTIONS: "controller_actions",
    KEY_GAMES_PLAY_CONTROLLER_ACTIONS_LABEL: "controller actions",
    KEY_GAMES_PLAY_CONTROLLER_COLOR: "controller_color",
    KEY_GAMES_PLAY_CONTROLLER_COLOR_LABEL: "controller color",
    CONTROLLER_COLORS,
    normalize_controller_color,
    CONTROLLER_COLOR_TEXT: Object.fromEntries(
      CONTROLLER_COLORS.map((color) => [color, color]),
    ),
    KEY_GAMES_PLAY_CONTROLLER_LABEL: "device",
    KEY_GAMES_PLAY_CONTROLLER_ON_SCREEN: "on screen",
    KEY_GAMES_PLAY_CONTROLLER_KEYBOARD: "keyboard",
    KEY_GAMES_PLAY_CONTROLLER_HAND_HELD: "hand held",
    KEY_GAMES_PLAY_FULL_SCREEN_LABEL: "full screen",
    KEY_GAMES_PLAY_FULL_SCREEN_ERROR: "fullscreen error",
    KEY_GAMES_PLAY_FULL_SCREEN_UNAVAILABLE: "unavailable",
    document,
  });
  const render = () => {
    cursor = 0;
    return component({ fullscreen_target_ref });
  };
  render();
  const cleanup = effects[0]();
  const toggle = () => render().children[0].children[1].children[1].props;
  return {
    document,
    game_area,
    saved,
    listeners,
    render,
    toggle,
    cleanup,
    counts: () => ({ requests, exits }),
  };
}

test("toggle fullscreens only the game area and exits back to normal layout", async () => {
  const view = mount();
  assert.equal(view.toggle().checked, false);
  await view.toggle().onChange(null, true);
  assert.equal(view.document.fullscreenElement, view.game_area);
  assert.notEqual(
    view.document.fullscreenElement,
    view.document.documentElement,
  );
  assert.equal(view.toggle().checked, true);
  assert.equal(view.saved.at(-1).fullscreen, true);
  await view.toggle().onChange(null, false);
  assert.equal(view.document.fullscreenElement, null);
  assert.equal(view.toggle().checked, false);
  assert.equal(view.saved.at(-1).fullscreen, false);
  assert.deepEqual(view.counts(), { requests: 1, exits: 1 });
});

test("fullscreen belonging to another element does not check the game toggle", () => {
  const view = mount();
  view.document.fullscreenElement = view.document.documentElement;
  view.listeners.get("fullscreenchange")();
  assert.equal(view.toggle().checked, false);
  assert.equal(view.saved.at(-1).fullscreen, false);
});

test("browser Escape exits update the toggle; unmount removes its listener", async () => {
  const view = mount();
  await view.toggle().onChange(null, true);
  view.document.fullscreenElement = null;
  view.listeners.get("fullscreenchange")();
  assert.equal(view.toggle().checked, false);
  assert.equal(view.saved.at(-1).fullscreen, false);
  view.cleanup();
  assert.equal(view.listeners.size, 0);
});

test("rejected entry leaves toggle off with an error and permits retry", async () => {
  const view = mount({ reject: true });
  await view.toggle().onChange(null, true);
  assert.equal(view.toggle().checked, false);
  assert.equal(view.toggle().disabled, false);
  assert.equal(view.saved.at(-1).fullscreen, false);
  assert.match(JSON.stringify(view.render()), /fullscreen error/);
});

test("unsupported browsers disable entry and mounting never requests fullscreen", () => {
  const view = mount({ supported: false });
  assert.equal(view.toggle().disabled, true);
  assert.deepEqual(view.counts(), { requests: 0, exits: 0 });
  assert.match(JSON.stringify(view.render()), /unavailable/);
});

test("controller dropdown restores and saves the selected controller", () => {
  const view = mount({ controller: "keyboard" });
  const controller_dropdown = (tree) =>
    tree.children.find(
      (section) => section.children[0].children[0] === "control",
    ).children[1].children[1];
  const dropdown = () => controller_dropdown(view.render());
  assert.equal(dropdown().props.value, "keyboard");
  assert.deepEqual(
    Array.from(dropdown().children[0], (option) => option.children[0]),
    ["on screen", "keyboard", "hand held"],
  );
  dropdown().props.onChange({ target: { value: "hand_held" } });
  assert.equal(dropdown().props.value, "hand_held");
  assert.equal(view.saved.at(-1).controller, "hand_held");
  const invalid = mount({ controller: "unknown" });
  assert.equal(controller_dropdown(invalid.render()).props.value, "on_screen");
});

test("controller actions switch defaults off and persists its selection", () => {
  const view = mount();
  const actions_toggle = () =>
    view.render().children[0].children[2].children[1].props;
  assert.equal(actions_toggle().checked, false);
  actions_toggle().onChange(null, true);
  assert.equal(actions_toggle().checked, true);
  assert.equal(view.saved.at(-1).controller_actions, true);
  const restored = mount({ controller_actions: true });
  assert.equal(
    restored.render().children[0].children[2].children[1].props.checked,
    true,
  );
});

test("controller color dropdown has all requested colors, restores and saves choices", () => {
  const view = mount();
  const dropdown = () => view.render().children[0].children[3].children[1];
  assert.equal(dropdown().props.value, "blue");
  assert.deepEqual(
    Array.from(dropdown().children[0], (option) => option.children[0]),
    [
      "green",
      "red",
      "orange",
      "white",
      "violet",
      "blue",
      "pink",
      "yellow",
      "black",
      "grey",
    ],
  );
  dropdown().props.onChange({ target: { value: "red" } });
  assert.equal(dropdown().props.value, "red");
  assert.equal(view.saved.at(-1).controller_color, "red");
  const restored = mount({ controller_color: "grey" });
  assert.equal(
    restored.render().children[0].children[3].children[1].props.value,
    "grey",
  );
  const invalid = mount({ controller_color: "invalid" });
  assert.equal(
    invalid.render().children[0].children[3].children[1].props.value,
    "blue",
  );
});
