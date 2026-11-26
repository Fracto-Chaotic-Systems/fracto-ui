import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import {
  INITIAL_PLAY_FLOW,
  play_flow_reducer,
} from "../src/pages/games/GamesPlayFlow.js";
import { settings_drawer_layout } from "../src/pages/games/GamesPlaySettingsLayout.js";
import { create_controller_input } from "../src/pages/games/controllers/ControllerInput.js";
import { create_flight_controls } from "../src/pages/games/controllers/FlightControls.js";
import {
  create_flight_state,
  INITIAL_FLIGHT_STATE,
} from "../src/pages/games/flight/FlightState.js";

const code = (file) =>
  transformSync(
    readFileSync(
      new URL(`../src/pages/games/${file}`, import.meta.url),
      "utf8",
    ).replace(/^import[\s\S]*?;\r?\n/gm, ""),
    { loader: "jsx", format: "cjs" },
  ).code;
const styled = Object.assign(
  () => () => Symbol("styled"),
  Object.fromEntries(
    ["div", "button", "h2"].map((name) => [name, () => Symbol(name)]),
  ),
);
const React = {
  createElement: (type, props, ...children) => ({
    type,
    props: props || {},
    children,
  }),
};
function hooks() {
  const values = [],
    effects = [];
  let cursor = 0;
  const state = (initial) => {
    const i = cursor++;
    if (!(i in values))
      values[i] = typeof initial === "function" ? initial() : initial;
    return [
      values[i],
      (next) => {
        values[i] = typeof next === "function" ? next(values[i]) : next;
      },
    ];
  };
  return {
    useState: state,
    useReducer: (reducer, initial) => {
      const [value, set] = state(initial);
      return [value, (event) => set((s) => reducer(s, event))];
    },
    useRef: (value) => state(() => ({ current: value }))[0],
    useId: () => "fixture-id",
    useEffect: (effect) => effects.push(effect),
    useCallback: (callback) => callback,
    effects,
    rewind() {
      cursor = 0;
    },
  };
}
const nodes = (node) =>
  !node || typeof node !== "object"
    ? []
    : Array.isArray(node)
      ? node.flatMap(nodes)
      : [node, ...nodes(node.children)];

test("development launch, Reset to prelude, explicit completion, repeated reset and stale completion", () => {
  const h = hooks(),
    module = { exports: {} };
  const Interactive = Symbol("interactive"),
    Prelude = Symbol("prelude"),
    Settings = Symbol("settings"),
    Grass = Symbol("grass"),
    Drawer = Symbol("drawer");
  vm.runInNewContext(code("GamesPlay.jsx"), {
    module,
    exports: module.exports,
    React,
    styled,
    ...h,
    INITIAL_PLAY_FLOW,
    play_flow_reducer,
    settings_drawer_layout,
    MIN_SETTINGS_POSITION: 0.5,
    MAX_SETTINGS_POSITION: 0.95,
    GamesPlayInteractive: Interactive,
    GamesPlayTv: "tv",
    GamesPlayPrelude: Prelude,
    GamesPlayConfirmation: "confirmation",
    GamesPlayIntroTitle: "intro-title",
    GamesPlaySettings: Settings,
    GamesPlayGrass: Grass,
    AppSettings: { get: () => 0.7 },
    AppText: { get: (key) => key },
    styles: { SectionTitle: "h1" },
    screen_media: [],
    KEY_GAMES_PLAY_SETTINGS_POSITION: "position",
    KEY_GAMES_PLAY_TITLE: "play",
    KEY_GAMES_PLAY_SETTINGS: "settings",
    KEY_GAMES_PLAY_SETTINGS_TITLE: "Settings",
    KEY_GAMES_PLAY_SETTINGS_CLOSE: "close",
    Drawer,
    ClickAwayListener: "clickaway",
    FontAwesomeIcon: "icon",
    faXmark: "x",
    faGear: "gear",
  });
  const render = () => {
    h.rewind();
    const tree = nodes(module.exports.default());
    assert.equal(
      tree.filter((node) => node.type === "h1").length,
      1,
      "The page title must remain mounted in every play phase",
    );
    const play = tree.find((node) => node.props.onClickCapture);
    const keys = play.children
      .filter((node) => node?.props?.key !== undefined)
      .map((node) => node.props.key);
    assert.equal(
      new Set(keys).size,
      keys.length,
      "Sibling layers need distinct React keys to unmount old sessions",
    );
    return tree;
  };
  let tree = render();
  const find = (type) => tree.find((n) => n.type === type);
  assert.ok(find(Interactive));
  assert.ok(!find(Prelude));
  assert.ok(!find("intro-title"));
  assert.equal(find(Grass).props.key, "grass-0");
  assert.equal(find(Grass).props.introduction, false);
  const tv_key = find("tv").props.key;
  tree.find((n) => n.props["aria-haspopup"] === "dialog").props.onClick();
  tree = render();
  assert.equal(find(Drawer).props.open, true);
  find(Settings).props.on_reset();
  tree = render();
  assert.ok(!find(Interactive));
  assert.ok(find(Prelude));
  assert.equal(find(Drawer).props.open, false);
  assert.ok(
    !find(Grass),
    "Background reveal starts after the last word disappears",
  );
  assert.ok(!tree.find((n) => n.props["aria-haspopup"] === "dialog"));
  assert.equal(find("tv").props.visible, false);
  find(Prelude).props.on_prepare();
  tree = render();
  assert.equal(find(Grass).props.reveal_limit, -1);
  assert.equal(find(Grass).props.key, "grass-1");
  assert.ok(
    find(Prelude).props.audio_ref,
    "Text cues use the mounted soundtrack element",
  );
  assert.equal(find(Prelude).props.audio_error, false);
  const stale_reveal = find(Prelude).props.on_tv_reveal;
  stale_reveal();
  tree = render();
  assert.equal(find("tv").props.visible, true);
  assert.equal(
    find(Grass).props.reveal_limit,
    0,
    "Only moving ladybugs join TV and CHAOS",
  );
  assert.equal(
    find("tv").props.key,
    tv_key,
    "Reset must reuse the initialized TV",
  );
  const stale_complete = find(Prelude).props.on_complete;
  stale_complete();
  tree = render();
  assert.ok(find("confirmation"));
  assert.equal(find("intro-title").props.key, "intro-title-1");
  assert.equal(find("intro-title").props.audio_ref, find("audio").props.ref);
  assert.ok(!find(Interactive));
  assert.equal(find(Grass).props.key, "grass-1");
  assert.equal(
    find(Grass).props.reveal_limit,
    3,
    "Landscape starts after CHAOS disappears",
  );
  assert.equal(find(Grass).props.introduction, true);
  assert.ok(!tree.find((n) => n.props["aria-haspopup"] === "dialog"));
  tree
    .find((node) => node.props.onKeyDownCapture)
    .props.onKeyDownCapture({
      key: "Enter",
      preventDefault() {},
      stopPropagation() {},
    });
  tree = render();
  assert.ok(find("confirmation"), "Stage keys cannot confirm the message");
  tree
    .find((node) => node.props.onClickCapture)
    .props.onClickCapture({
      preventDefault() {
        throw new Error("Background click was intercepted");
      },
      stopPropagation() {
        throw new Error("TV interaction was intercepted");
      },
    });
  tree = render();
  assert.ok(
    !find(Interactive),
    "Clicking the background or TV cannot enter play",
  );
  const stale_confirm = find("confirmation").props.on_confirm;
  stale_confirm();
  tree = render();
  assert.ok(find(Interactive));
  assert.equal(find(Interactive).props.key, "interactive-1");
  assert.ok(
    !find("intro-title"),
    "Confirm removes the welcome-only title and its cue observer",
  );
  assert.equal(find(Grass).props.key, "grass-1");
  assert.equal(
    find(Grass).props.introduction,
    true,
    "Confirm cannot restart the background introduction",
  );
  assert.ok(!find(Prelude));
  assert.equal(find("tv").props.key, tv_key);
  find(Settings).props.on_reset();
  tree = render();
  assert.ok(!find(Grass));
  assert.equal(find(Prelude).props.key, "prelude-2");
  assert.equal(find("tv").props.key, tv_key);
  stale_reveal();
  stale_confirm();
  tree = render();
  assert.equal(find("tv").props.visible, false);
  const capture = tree.find((node) => node.props.onClickCapture).props;
  let prevented = 0,
    stopped = 0;
  capture.onClickCapture({
    preventDefault: () => prevented++,
    stopPropagation: () => stopped++,
  });
  tree = render();
  assert.ok(
    find("confirmation"),
    "Skipping text must still require confirmation",
  );
  assert.ok(!find(Interactive));
  assert.equal(prevented, 1);
  assert.equal(stopped, 1);
  find("confirmation").props.on_confirm();
  tree = render();
  assert.ok(find(Interactive));
  find(Settings).props.on_reset();
  tree = render();
  stale_complete();
  tree = render();
  assert.ok(find(Prelude));
  find(Prelude).props.on_complete();
  tree = render();
  assert.ok(find("confirmation"));
  tree
    .find((node) => node.props.onClickCapture)
    .props.onClickCapture({
      preventDefault() {},
      stopPropagation() {},
    });
  tree = render();
  assert.ok(find("confirmation"));
  assert.ok(!find(Interactive));
  find("confirmation").props.on_confirm();
  tree = render();
  assert.equal(find(Interactive).props.key, "interactive-3");
  find(Settings).props.on_reset();
  tree = render();
  const keyboard = tree.find((node) => node.props.onKeyDownCapture).props;
  keyboard.onKeyDownCapture({
    key: "Escape",
    preventDefault() {},
    stopPropagation() {},
  });
  tree = render();
  assert.ok(find("confirmation"));
  assert.ok(!find(Interactive));
  assert.equal(INITIAL_PLAY_FLOW.phase, "interactive");
});

test("interactive sessions own fresh input, flight state and effect cleanups", () => {
  const mounted = [];
  const mount = () => {
    const h = hooks(),
      module = { exports: {} },
      cleanups = [];
    vm.runInNewContext(code("GamesPlayInteractive.jsx"), {
      module,
      exports: module.exports,
      React,
      styled,
      ...h,
      create_controller_input,
      create_flight_controls,
      create_flight_state,
      INITIAL_FLIGHT_STATE,
      useCanvasShape: () => "cinema",
      useFisheyeStrength: () => 0.35,
      useAtmosphere: () => 25,
      bind_flight_controls(input, controls) {
        mounted.push({ input, controls });
        return () => {
          input.reset();
          controls.reset();
          cleanups.push("input");
        };
      },
      start_flight_simulation(state) {
        mounted.at(-1).state = state;
        return () => cleanups.push("simulation");
      },
      read_flight_control_settings() {},
      subscribe_flight_control_settings() {},
      FlightScene: "scene",
      GamesPlayControls: "controls",
      GamesCrt: "crt",
    });
    module.exports.default({ width_px: 1000, height_px: 700 });
    const stops = h.effects.map((effect) => effect());
    return {
      stop() {
        stops.forEach((stop) => stop());
      },
      cleanups,
    };
  };
  const first = mount(),
    original = mounted[0];
  original.state.update({ airspeed_knots: 100, roll_deg: 45 });
  original.input.update({ connected: true, axes: [1, 1] });
  first.stop();
  assert.deepEqual(first.cleanups.sort(), ["input", "simulation"]);
  const second = mount(),
    fresh = mounted[1];
  assert.notEqual(original.state, fresh.state);
  assert.notEqual(original.input, fresh.input);
  assert.notEqual(original.controls, fresh.controls);
  assert.deepEqual(fresh.state.get_snapshot(), INITIAL_FLIGHT_STATE);
  assert.equal(fresh.input.get_snapshot().connected, false);
  second.stop();
});
