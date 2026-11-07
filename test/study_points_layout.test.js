import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";

const source = (path) =>
  readFileSync(new URL(path, import.meta.url), "utf8")
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace(/^export default .*;$/gm, "")
    .replace(/^export /gm, "");

const definitions = vm.runInNewContext(
  source("../src/settings/StudySettings.jsx") + ";APP_STUDY_SETTINGS",
  {
    TYPE_NUMBER: "number",
    TYPE_STRING: "string",
    TYPE_OBJECT: "object",
    TYPE_ARRAY: "object",
    DEFAULT_SIDEBAR_WIDTH: 200,
  },
);
const vertical_key = "study/points/vertical_splitter_pos";
const horizontal_key = "study/points/horizontal_splitter_pos";

test("orbital points splitters nest correctly and persist independent offsets across reloads", () => {
  const storage = new Map();
  let id = 0;
  const AppSettings = vm.runInNewContext(
    source("../src/AppSettings.jsx") + ";AppSettings",
    {
      copy_json: (value) => JSON.parse(JSON.stringify(value)),
      random_id: () => String(++id),
      localStorage: {
        getItem: (key) => storage.get(key),
        setItem: (key, value) => storage.set(key, value),
      },
      console: { log() {} },
    },
  );
  const settings = Object.fromEntries(
    [vertical_key, horizontal_key].map((key) => {
      assert.equal(definitions[key].default_value, 500);
      assert.equal(definitions[key].persist, true);
      return [key, definitions[key]];
    }),
  );
  AppSettings.initialize(settings);
  const window_handlers = new Map();
  let observer_disconnected = false;
  const Page = vm.runInNewContext(
    transformSync(source("../src/pages/study/StudyPoints.jsx"), {
      loader: "jsx",
    }).code + ";StudyPoints",
    {
      AppSettings,
      Component: class {
        setState(update) {
          Object.assign(this.state, update);
        }
      },
      React: {
        createRef: () => ({ current: null }),
        createElement: (type, props, ...children) => ({
          type,
          props,
          children,
        }),
        Fragment: "fragment",
      },
      styled: { div: () => "div" },
      styles: { SectionTitle: "title" },
      AppText: { get: () => "orbital points" },
      KEY_STUDY_POINTS: "study/study_points",
      KEY_STUDY_POINTS_VERTICAL_SPLITTER_POS: vertical_key,
      KEY_STUDY_POINTS_HORIZONTAL_SPLITTER_POS: horizontal_key,
      SPLITTER_WIDTH_PX: 6,
      CoolSplitter: "splitter",
      PointsMinibrotTabs: "minibrot-tabs",
      PointsStoredOrbitals: "stored-orbitals",
      SPLITTER_TYPE_VERTICAL: "vertical",
      SPLITTER_TYPE_HORIZONTAL: "horizontal",
      ResizeObserver: class {
        observe() {}
        disconnect() {
          observer_disconnected = true;
        }
      },
      window: {
        innerHeight: 1000,
        addEventListener: (key, fn) => window_handlers.set(key, fn),
        removeEventListener: (key) => window_handlers.delete(key),
      },
    },
  );
  let width = 1400;
  const mount = () => {
    const page = new Page();
    page.container_ref.current = {
      getBoundingClientRect: () => ({ width, top: 100 }),
    };
    page.componentDidMount();
    return page;
  };
  const splitters = (page) => page.render().children[1].children[3].children;
  const page = mount();
  const left_sections = page.render().children[1].children[0].children;
  assert.equal(left_sections.length, 3);
  assert.equal(left_sections[1].children[0].type, "minibrot-tabs");
  assert.equal(left_sections[0].children.length, 0);
  assert.equal(left_sections[2].children[0].type, "stored-orbitals");
  const selected = { id: 55, core_point: '{"x":0,"y":0}' };
  left_sections[1].children[0].props.on_select_minibrot(selected);
  assert.equal(
    page.render().children[1].children[0].children[2].children[0].props
      .selected_minibrot,
    selected,
  );
  let [vertical, horizontal] = splitters(page);
  assert.equal(vertical.props.position, 500);
  assert.equal(horizontal.props.position, 500);
  assert.equal(vertical.props.container_bounds.height, 900);
  assert.equal(horizontal.props.container_bounds.left, 503);
  assert.equal(horizontal.props.container_bounds.width, 897);
  vertical.props.on_change(650);
  horizontal.props.on_change(350);
  assert.equal(storage.get(vertical_key), "650");
  assert.equal(storage.get(horizontal_key), "350");
  width = 300;
  window_handlers.get("resize")();
  [vertical, horizontal] = splitters(page);
  assert.equal(vertical.props.position, 297);
  assert.equal(horizontal.props.container_bounds.width, 0);
  assert.equal(storage.get(vertical_key), "650");
  page.componentWillUnmount();
  assert.equal(observer_disconnected, true);
  assert.equal(window_handlers.size, 0);
  assert.equal(Object.keys(AppSettings.subscriptions).length, 0);
  AppSettings.initialize(settings);
  width = 1400;
  const restored = mount();
  [vertical, horizontal] = splitters(restored);
  assert.equal(vertical.props.position, 650);
  assert.equal(horizontal.props.position, 350);
  assert.equal(horizontal.props.container_bounds.left, 653);
  restored.componentWillUnmount();
});
