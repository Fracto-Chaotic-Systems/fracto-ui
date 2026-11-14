import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";

const source = readFileSync(
  new URL("../src/pages/games/GamesPlaySettings.jsx", import.meta.url),
  "utf8",
)
  .replace(/^import[\s\S]*?;\r?\n/gm, "")
  .replace("export default function", "function");
const code = transformSync(source, { loader: "jsx" }).code;

function mount({ reject = false, supported = true } = {}) {
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
    AppSettings: { on_settings_changed: (value) => saved.push(value) },
    KEY_GAMES_PLAY_FULL_SCREEN: "fullscreen",
    KEY_GAMES_PLAY_DISPLAY: "display",
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
  const toggle = () => render().children[1].children[1].props;
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
