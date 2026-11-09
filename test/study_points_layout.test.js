import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import { build_orbital_trace_request } from "../src/pages/study/points/PointsOrbitalTraceRequest.js";

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

test("Julia pane shares the survey canvas at fixed size and scope for the selected core", () => {
  const Julia = vm.runInNewContext(
    transformSync(
      source("../src/pages/study/points/PointsJuliaSet.jsx").replace(
        "default function", "function",
      ),
      { loader: "jsx" },
    ).code + ";PointsJuliaSet",
    {
      React: { createElement: (type, props, ...children) => ({ type, props, children }) },
      PointsJuliaCanvas: "survey-canvas",
      build_orbital_trace_request,
      SEED_SURVEY_DISCOVERY_OPTIONS: { iteration_limit: 100000 },
      POINTS_ORBITAL_TEXT: { julia_canvas: "julia" },
      AppText: { get: () => "Julia set" },
      selected_core_point: (selected) => JSON.parse(selected.core_point),
    },
  );
  const selected = {
    id: 55,
    core_point: '{"x":"-0.75","y":"0.1"}',
    display_settings: '{"scope":0.01,"focal_point":{"x":0,"y":0}}',
  };
  const view = Julia({ selected_minibrot: selected });
  const canvas = view.children[0];
  assert.equal(view.props.style.marginRight, "auto");
  assert.equal(canvas.type, "survey-canvas");
  assert.equal(canvas.props.size_px, 500);
  assert.equal(canvas.props.source_size_px, 500);
  assert.equal(canvas.props.half_span * 2, 4.0);
  assert.equal(canvas.props.iteration_limit, 100000);
  assert.equal(canvas.props.focal_point.x, -0.75);
  assert.equal(canvas.props.focal_point.y, 0.1);
  assert.equal(canvas.props.trace_request, null);
  const orbital = {
    orbital_id: "7", period: 1,
    points: [{ point_index: 0, point: { re: "0.3", im: "0.4" },
      landing_ratios: [{ numerator: "1", denominator: "7" }] }],
  };
  const requested = Julia({ selected_minibrot: selected, selected_orbital: orbital });
  assert.equal(requested.children[0].props.trace_request.requests[0].angle.key, "1/7");
  assert.equal(requested.children[0].props.trace_request.focal_point.x, "-0.75");
  assert.equal(Julia({ selected_minibrot: null }), null);
  assert.equal(Julia({ selected_minibrot: { core_point: "invalid" } }), null);
  const next = Julia({ selected_minibrot: { core_point: '{"x":0.2,"y":0.3}' } });
  assert.equal(next.children[0].props.focal_point.x, 0.2);
});

test("Julia and shared circuitry remain side by side with matching height and remaining width", () => {
  const Panel = vm.runInNewContext(
    transformSync(
      source("../src/pages/study/points/PointsOrbitalPanel.jsx").replace(
        "default function", "function",
      ),
      { loader: "jsx" },
    ).code + ";PointsOrbitalPanel",
    {
      React: { createElement: (type, props, ...children) => ({ type, props, children }) },
      CircuitryChart: "circuitry", PointsJuliaSet: "julia",
      selected_core_point: (selected) => JSON.parse(selected.core_point),
    },
  );
  const selected_minibrot = {
    id: 55, pattern: 3,
    core_point: '{"x":"-0.12","y":"0.74"}',
    display_settings: '{"scope":"0.05","focal_point":{"x":0,"y":0}}',
  };
  const selected_orbital = { orbital_id: "7" };
  const panel = Panel({ selected_minibrot, selected_orbital, width_px: 1400 });
  assert.equal(panel.props.style.display, "flex");
  assert.equal(panel.props.style.alignItems, "flex-start");
  assert.equal(panel.props.style.width, "100%");
  const julia = panel.children[0].children[0];
  assert.equal(julia.type, "julia");
  assert.equal(julia.props.selected_orbital, selected_orbital);
  const chart = panel.children[1].children[0];
  assert.equal(chart.type, "circuitry");
  assert.equal(chart.props.height_px, 500);
  assert.equal(panel.children[1].props.style.height, 500);
  assert.equal(chart.props.width_px, 888);
  assert.equal(chart.props.focal_point.x, -0.12);
  assert.equal(chart.props.focal_point.y, 0.74);
  assert.equal(chart.props.scope, 0.05);
  assert.equal(chart.props.selected_orbital, selected_orbital);
  const narrow = Panel({ selected_minibrot, width_px: 900 });
  assert.equal(narrow.children[1].children[0].props.width_px, 500);
  assert.equal(narrow.children[1].children[0].props.selected_orbital, null);
  assert.equal(narrow.props.style.minWidth, 1012);
  const resized = Panel({ selected_minibrot, width_px: 1800 });
  assert.equal(resized.children[1].children[0].props.width_px, 1288);
  assert.equal(resized.children[1].children[0].props.key, chart.props.key);
  assert.equal(Panel({ selected_minibrot: null, width_px: 1400 }), null);
});

test("selected preview uses saved display settings and fits the available panel", () => {
  const Preview = vm.runInNewContext(
    transformSync(
      source("../src/pages/study/points/PointsSelectedPreview.jsx").replace(
        "default function", "function",
      ),
      { loader: "jsx" },
    ).code + ";PointsSelectedPreview",
    {
      React: { createElement: (type, props, ...children) => ({ type, props, children }) },
      FractoRasterImage: "raster",
    },
  );
  const settings = { focal_point: { x: -0.75, y: 0.1 }, scope: 0.02 };
  const props = {
    selected_minibrot: {
      id: 55,
      core_point: '{"x":0,"y":0}',
      display_settings: JSON.stringify(settings),
    },
    width_px: 297,
    height_px: 200,
  };
  const image = Preview(props).children[0];
  assert.equal(image.type, "raster");
  assert.equal(image.props.width_px, 200);
  assert.equal(image.props.focal_point.x, -0.75);
  assert.equal(image.props.focal_point.y, 0.1);
  assert.equal(image.props.scope, 0.02);
  assert.equal(Preview({ ...props, selected_minibrot: null }), null);
  assert.equal(Preview({ ...props, selected_minibrot: { display_settings: "invalid" } }), null);
  assert.equal(Preview({ ...props, width_px: 0 }), null);
  assert.equal(Preview({ ...props, selected_minibrot: { id: 56, display_settings: settings } }).children[0].props.scope, 0.02);
});

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
      PointsSelectedPreview: "selected-preview",
      PointsOrbitalPanel: "orbital-panel",
      PointsOrbitalPointList: "orbital-point-list",
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
  assert.equal(left_sections[0].children[0].type, "selected-preview");
  assert.equal(left_sections[0].children[0].props.width_px, 297);
  assert.equal(left_sections[0].children[0].props.height_px, 300);
  assert.equal(left_sections[2].children[0].type, "stored-orbitals");
  const selected = { id: 55, core_point: '{"x":0,"y":0}' };
  left_sections[1].children[0].props.on_select_minibrot(selected);
  const julia = page.render().children[1].children[1].children[0];
  assert.equal(julia.type, "orbital-panel");
  assert.equal(julia.props.width_px, 1097);
  assert.equal(julia.props.selected_minibrot, selected);
  const orbital = { orbital_id: "1", points: [] };
  page.render().children[1].children[0].children[2].children[0].props
    .on_select_orbital(orbital);
  assert.equal(
    page.render().children[1].children[1].children[0].props.selected_orbital,
    orbital,
  );
  julia.props.on_active_point_changed("1", 2);
  const lower_list = page.render().children[1].children[2].children[0];
  assert.equal(lower_list.type, "orbital-point-list");
  assert.equal(lower_list.props.selected_orbital, orbital);
  assert.equal(lower_list.props.active_point_index, 2);
  julia.props.on_active_point_changed("previous-orbital", 3);
  assert.equal(page.state.active_point_index, 2);
  page.on_select_minibrot(selected);
  assert.equal(page.state.active_point_index, -1);
  assert.equal(page.state.selected_orbital, null);
  assert.equal(
    page.render().children[1].children[0].children[0].children[0].props
      .selected_minibrot,
    selected,
  );
  assert.equal(
    page.render().children[1].children[0].children[2].children[0].props
      .selected_minibrot,
    selected,
  );
  let [vertical, horizontal] = splitters(page);
  assert.equal(vertical.props.position, 300);
  assert.equal(vertical.props.min_position, 100);
  assert.equal(vertical.props.max_position, 300);
  assert.equal(horizontal.props.position, 500);
  assert.equal(vertical.props.container_bounds.height, 900);
  assert.equal(horizontal.props.container_bounds.left, 303);
  assert.equal(horizontal.props.container_bounds.width, 1097);
  vertical.props.on_change(650);
  horizontal.props.on_change(350);
  assert.equal(storage.get(vertical_key), "300");
  vertical.props.on_change(50);
  assert.equal(storage.get(vertical_key), "100");
  assert.equal(splitters(page)[0].props.position, 100);
  vertical.props.on_change(250);
  assert.equal(storage.get(horizontal_key), "350");
  width = 200;
  window_handlers.get("resize")();
  [vertical, horizontal] = splitters(page);
  assert.equal(vertical.props.position, 197);
  assert.equal(horizontal.props.container_bounds.width, 0);
  assert.equal(storage.get(vertical_key), "250");
  page.componentWillUnmount();
  assert.equal(observer_disconnected, true);
  assert.equal(window_handlers.size, 0);
  assert.equal(Object.keys(AppSettings.subscriptions).length, 0);
  AppSettings.initialize(settings);
  width = 1400;
  const restored = mount();
  [vertical, horizontal] = splitters(restored);
  assert.equal(vertical.props.position, 250);
  assert.equal(horizontal.props.position, 350);
  assert.equal(horizontal.props.container_bounds.left, 253);
  restored.componentWillUnmount();
});
