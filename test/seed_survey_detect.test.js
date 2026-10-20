import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  orbital_confirmation,
  orbital_closure_error,
  ORBIT_CLOSURE_TOLERANCE,
} from "../src/pages/assets/surveys/SeedSurveyOrbitConfirmation.js";
import { transformSync } from "esbuild";

const harness = (Q = { x: 0, y: 0 }) => {
  const calls = [],
    newton_calls = [],
    charts = [],
    ray_paints = [],
    frames = new Map();
  const source = readFileSync(
    new URL(
      "../src/pages/assets/surveys/SeedSurveyDetect.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  const code = transformSync(
    source
      .replace(/^import[\s\S]*?;\r?\n/gm, "")
      .replace(/^export default .*;$/gm, "")
      .replace(/^export class /gm, "class "),
    { loader: "jsx" },
  ).code;
  const type = () => type;
  type.isRequired = type;
  const Detect = vm.runInNewContext(`${code}\nSeedSurveyDetect`, {
    React: {
      createElement: (type, props, ...children) => ({ type, props, children }),
    },
    Component: class {
      constructor(props) {
        this.props = props;
      }
      setState(update, callback) {
        Object.assign(this.state, update);
        callback?.();
      }
    },
    ChartJS: { register: () => {} },
    registerables: [],
    orbital_confirmation,
    orbital_closure_error,
    ORBIT_CLOSURE_TOLERANCE,
    IMAGE_FRAME_STYLE: {},
    FractoFastCalc: {
      calc_from_seed: (...args) => {
        calls.push(args);
        return {
          pattern: 2,
          orbital_points: [
            { x: 90, y: 90 },
            { x: 99, y: 99 },
            { x: 90, y: 90 },
          ],
        };
      },
      calculate_cardioid_Q: () => Q,
    },
    newton_big_complex: (...args) => {
      newton_calls.push(args);
      return {
        closure_reached: true,
        point_list: [
          { re: "1", im: "2" },
          { re: "3", im: "4" },
        ],
      };
    },
    click_point_chart: (...args) => {
      charts.push(args);
      return { type: "chart" };
    },
    requestAnimationFrame: (callback) => {
      const id = Symbol();
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    PropTypes: new Proxy({}, { get: () => type }),
    SeedSurveyCanvas: "canvas",
    SeedSurveyOrbitals: "orbitals",
    SeedSurveyRays: "rays",
    paint_survey_rays: (...args) => ray_paints.push(args),
    AppText: { get: (key) => key },
    KEY_ASSETS_SURVEYS_DETECT: "detect",
    KEY_ASSETS_SURVEYS_CANVAS_DETECT: "detect-canvas",
    KEY_ASSETS_SURVEYS_ORBIT_NEWTON: "newton",
    KEY_ASSETS_SURVEYS_ORBIT_LEGACY: "legacy",
    KEY_ASSETS_SURVEYS_CLOSURE_ERROR: "closure error: ${error} (${status})",
    KEY_ASSETS_SURVEYS_CLOSURE_PASS: "within tolerance",
    KEY_ASSETS_SURVEYS_CLOSURE_FAIL: "not closed",
    KEY_ASSETS_SURVEYS_NEWTON_CYCLES: "newton cycles: ${cycles}",
    KEY_ASSETS_SURVEYS_ORBIT_CONFIDENCE: "confidence: ${confidence}",
    KEY_ASSETS_SURVEYS_PATTERN: "pattern: ${pattern}",
    KEY_ASSETS_SURVEYS_ORBIT_MAGNITUDE: "magnitude: ${magnitude}",
    KEY_ASSETS_SURVEYS_SEEDED_ORBIT: "seeded-orbit",
    KEY_ASSETS_SURVEYS_SEED_COORDINATES: "seed: (${x}, ${y})",
    KEY_STUDY_CIRCUITRY_NO_ORBITAL: "no-orbit",
  });
  const focal_point = { x: 0.1, y: 0.2 };
  const component = new Detect({ focal_point, width_px: 1000, height_px: 600 });
  const tick = () => {
    const [id, callback] = frames.entries().next().value;
    frames.delete(id);
    callback();
  };
  return {
    component,
    focal_point,
    calls,
    newton_calls,
    charts,
    ray_paints,
    frames,
    tick,
  };
};

test("detect places a 250-square source and a 550-square orbital chart side by side", () => {
  const { component, focal_point } = harness();
  const tree = component.render();
  assert.equal(tree.props.style.textAlign, "left");
  const canvas = tree.children[0].children[0];
  assert.equal(canvas.props.size_px, 550);
  assert.equal(canvas.props.source_size_px, 250);
  assert.equal(canvas.props.focal_point, focal_point);
  assert.equal(canvas.props.half_span, 1.5);
  assert.equal(canvas.props.iteration_limit, 100000);
  assert.equal(canvas.props.aria_label, "detect-canvas");
  assert.equal(canvas.props.on_seed_hover, component.on_seed_hover);
  assert.equal(tree.children[1].props.style.display, "inline-block");
  assert.equal(tree.children[1].children[0].props.style.width, "550px");
  assert.equal(tree.children[1].children[0].props.style.height, "550px");
});

test("initial zero seed and hover updates use local calculation and circuitry chart configuration", () => {
  const h = harness();
  h.component.componentDidMount();
  assert.deepEqual(h.calls[0], [0.1, 0.2, 0, 0, 0.00625, 100000]);
  assert.equal(h.newton_calls[0][2], 2);
  assert.deepEqual(JSON.parse(JSON.stringify(h.newton_calls[0][3])), {
    precision_digits: 64,
    seed: { x: 0, y: 0 },
  });
  h.component.render();
  assert.deepEqual(JSON.parse(JSON.stringify(h.charts.at(-1)[1])), [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
  ]);
  assert.equal(h.charts.at(-1)[1].length, 2);
  assert.equal(h.charts.at(-1)[7], 4);
  assert.equal(h.charts.at(-1)[15], true);
  h.component.on_seed_hover({ x: 0.5, y: 0.25 });
  h.component.on_seed_hover({ x: -0.5, y: -0.75 });
  assert.equal(h.frames.size, 1);
  assert.equal(h.calls.length, 1);
  h.tick();
  assert.deepEqual(h.calls.at(-1).slice(2, 4), [-0.5, -0.75]);
  assert.deepEqual(h.newton_calls.at(-1)[3].seed, { x: -0.5, y: -0.75 });
  h.component.on_seed_hover({ x: -0.5, y: -0.75 });
  h.tick();
  assert.equal(h.calls.length, 2);
});

test("focal changes reset the seed, cancelled frames cannot replace it, and missing orbits clear the chart", () => {
  const h = harness();
  h.component.componentDidMount();
  h.component.on_seed_hover({ x: 1, y: 1 });
  const previous = h.component.props;
  h.component.props = { ...previous, focal_point: { x: 0.3, y: 0.4 } };
  h.component.componentDidUpdate(previous);
  assert.equal(h.frames.size, 0);
  assert.deepEqual(h.calls.at(-1), [0.3, 0.4, 0, 0, 0.00625, 100000]);
  h.component.state.calculation = { pattern: 0 };
  assert.equal(h.component.render_orbital_chart(), "no-orbit");
  h.component.on_seed_hover({ x: 1, y: 1 });
  h.component.componentWillUnmount();
  assert.equal(h.frames.size, 0);
});

test("pattern and maximum orbital distance use the same Q as the chart", () => {
  const h = harness({ x: 1, y: 1 });
  h.component.componentDidMount();
  const details = h.component.orbital_details();
  assert.ok(Math.abs(details.magnitude - Math.sqrt(13)) < 1e-12);
  const metadata = h.component.render().children[1].children[2];
  assert.equal(metadata.children[1].children[0], "pattern: 2");
  assert.equal(
    metadata.children[2].children[0],
    `magnitude: ${Number(Math.sqrt(13).toPrecision(10))}`,
  );
  assert.deepEqual(h.charts.at(-1)[8], { x: 1, y: 1 });
  h.component.state.calculation = {
    pattern: 1,
    orbital_points: [{ x: 4, y: 5 }],
  };
  h.component.state.newton = {
    closure_reached: true,
    point_list: [{ re: 4, im: 5 }],
  };
  assert.equal(h.component.orbital_details().magnitude, 5);
  h.component.state.calculation = { pattern: 0 };
  assert.equal(h.component.orbital_details().magnitude, null);
  assert.equal(
    h.component.render().children[1].children[2].children[1].children[0],
    "pattern: 0",
  );
});

test("missing Newton points never fall back to calculator points", () => {
  const h = harness();
  h.component.componentDidMount();
  h.component.state.newton = { closure_reached: true, point_list: [] };
  assert.equal(h.component.render_orbital_chart(), "no-orbit");
  assert.equal(h.component.orbital_details().magnitude, null);
});

test("detect overlays Q in canvas coordinates and restores drawing state", () => {
  const h = harness({ x: 0.75, y: 0.75 });
  const calls = [];
  const context = {
    getImageData: () => ({}),
    putImageData: () => {},
    save: () => calls.push("save"),
    beginPath: () => calls.push("begin"),
    arc: (...args) => calls.push(args),
    fill() {
      calls.push(this.fillStyle);
    },
    stroke() {
      calls.push([this.strokeStyle, this.lineWidth]);
    },
    restore: () => calls.push("restore"),
  };
  const canvas = { width: 550, height: 550, getContext: () => context };
  const props = h.component.render().children[0].children[0].props;
  assert.equal(props.on_canvas_rendered, h.component.draw_Q);
  props.on_canvas_rendered(canvas);
  assert.deepEqual(calls, [
    "save",
    "begin",
    [412.5, 137.5, 4, 0, 2 * Math.PI],
    "#ffffff",
    ["#000000", 1],
    "restore",
  ]);
  h.component.props.focal_point = null;
  props.on_canvas_rendered(canvas);
  assert.equal(calls.length, 6);
});

test("hover overlays only chart points, clears old dots, and cancels pending hover on leave", () => {
  const h = harness();
  const arcs = [];
  const squares = [];
  let restores = 0;
  const context = {
    getImageData: () => ({}),
    putImageData: () => {
      restores++;
      arcs.length = 0;
      squares.length = 0;
    },
    save() {},
    restore() {},
    beginPath() {},
    fill() {},
    stroke() {},
    arc: (...args) => arcs.push(args),
    strokeRect(...args) {
      squares.push([this.strokeStyle, this.lineWidth, ...args]);
    },
  };
  h.component.draw_Q({ width: 550, height: 550, getContext: () => context });
  h.component.on_seed_hover({ x: 0.5, y: 0.25 });
  h.tick();
  assert.equal(arcs.length, 3);
  assert.equal(arcs[0][2], 1.5);
  assert.equal(arcs.at(-1)[2], 4, "Q is larger and drawn after orbital dots");
  assert.equal(squares.length, 2);
  assert.deepEqual(squares[0], [
    "#000000",
    1,
    arcs[0][0] - 3,
    arcs[0][1] - 3,
    6,
    6,
  ]);
  h.component.state.newton = { closure_reached: true, point_list: [] };
  h.component.paint_overlay();
  assert.equal(
    arcs.length,
    1,
    "missing chart clears orbital dots, retaining Q",
  );
  assert.equal(squares.length, 0);
  h.component.on_seed_hover({ x: 1, y: 1 });
  h.component.on_seed_leave();
  assert.equal(h.frames.size, 0);
  assert.equal(arcs.length, 1);
  assert.ok(restores >= 4);
});

test("radio selection switches chart and magnitude between existing Newton and legacy data", () => {
  const h = harness();
  h.component.componentDidMount();
  const radios = () => h.component.render().children[1].children[3].children[0];
  assert.equal(radios()[0].children[0].props.checked, true);
  assert.equal(radios()[1].children[0].props.checked, false);
  const call_count = h.calls.length;
  radios()[1].children[0].props.onChange({ target: { value: "legacy" } });
  assert.equal(radios()[1].children[0].props.checked, true);
  assert.equal(h.component.orbital_details().points[0].x, 90);
  assert.equal(h.component.orbital_details().points.length, 2);
  assert.equal(h.component.orbital_details().magnitude, Math.hypot(99, 99));
  radios()[0].children[0].props.onChange({ target: { value: "newton" } });
  assert.equal(h.component.orbital_details().points[0].x, 1);
  assert.equal(
    h.calls.length,
    call_count,
    "switch uses already calculated data",
  );
});

test("confidence uses the displayed method and is unavailable below the magnitude threshold", () => {
  const h = harness();
  h.component.state.calculation = {
    pattern: 3,
    orbital_points: [
      { x: 0.25, y: 0 },
      { x: 0.25, y: 0 },
      { x: 0.25, y: 0 },
    ],
  };
  h.component.state.newton = {
    closure_reached: true,
    point_list: [
      { re: 0.5, im: 0 },
      { re: 0.5, im: 0 },
      { re: 0.5, im: 0 },
    ],
  };
  assert.equal(h.component.orbital_details().confirmation.confidence, 1);
  assert.equal(
    h.component.render().children[1].children[1].children[0],
    "confidence: 100.00%",
  );
  h.component.state.orbit_method = "legacy";
  assert.equal(h.component.orbital_details().confirmation, null);
});

test("Newton cycles appear below confidence and clear when no solver result exists", () => {
  const h = harness();
  const cycle_text = () =>
    h.component.render().children[1].children[1].children[1].children[0];
  assert.equal(cycle_text(), "newton cycles: —");
  h.component.state.newton = { cycles: 7, point_list: [] };
  assert.equal(cycle_text(), "newton cycles: 7");
  h.component.state.orbit_method = "legacy";
  assert.equal(cycle_text(), "newton cycles: 7");
  h.component.state.newton = null;
  assert.equal(cycle_text(), "newton cycles: —");
});

test("selecting a scanned orbital shows persistent points and restores its seed after hover", () => {
  const h = harness();
  const arcs = [];
  const context = {
    getImageData: () => ({}),
    putImageData: () => {
      arcs.length = 0;
    },
    save() {},
    restore() {},
    beginPath() {},
    fill() {},
    stroke() {},
    strokeRect() {},
    arc: (...args) => arcs.push(args),
  };
  h.component.draw_Q({ width: 550, height: 550, getContext: () => context });
  const orbital = {
    seed: { x: 0.6, y: 0.7 },
    points: [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ],
  };
  const list = h.component.render().children[0].children[1];
  list.props.on_select_orbital(orbital);
  assert.equal(h.component.state.orbit_method, "newton");
  assert.equal(h.component.state.selected_orbital, orbital);
  assert.equal(arcs.length, 3, "selected points paint without hovering");
  assert.deepEqual(h.calls.at(-1).slice(2, 4), [0.6, 0.7]);
  h.component.on_seed_hover({ x: 0.2, y: 0.3 });
  h.tick();
  h.component.on_seed_leave();
  assert.deepEqual(h.calls.at(-1).slice(2, 4), [0.6, 0.7]);
  assert.equal(arcs.length, 3);
  const previous = h.component.props;
  h.component.props = { ...previous, focal_point: { x: 0.4, y: 0.1 } };
  h.component.componentDidUpdate(previous);
  assert.equal(h.component.state.selected_orbital, null);
});

test("hover displays closure failure separately from product confidence", () => {
  const h = harness();
  h.component.componentDidMount();
  assert.ok(h.component.orbital_details().closure_error > 1e-7);
  const metadata = h.component.render().children[1].children[1];
  assert.match(
    metadata.children[2].children[0],
    /closure error: .*\(not closed\)/,
  );
  h.component.state.newton = null;
  assert.equal(h.component.orbital_details().closure_error, null);
});

test("explicitly rejected Newton estimates never render points even if a payload includes them", () => {
  const h = harness();
  h.component.componentDidMount();
  h.component.state.newton = {
    closure_reached: false,
    closure_error: 0.5,
    point_list: [{ re: 1, im: 2 }],
  };
  assert.equal(h.component.render_orbital_chart(), "no-orbit");
  assert.equal(h.component.orbital_details().closure_error, 0.5);
});

test("rays belong only to table selection and are hidden during hover", () => {
  const h = harness();
  const context = {
    getImageData: () => ({}),
    putImageData() {},
    save() {},
    restore() {},
    beginPath() {},
    fill() {},
    stroke() {},
    strokeRect() {},
    arc() {},
  };
  h.component.draw_Q({ width: 550, height: 550, getContext: () => context });
  const rays = [{ angle: { key: "1/3" }, points: [{ x: 1, y: 0 }] }];
  h.component.on_rays(rays);
  assert.equal(h.ray_paints.length, 0);
  const orbital = { seed: { x: 0.25, y: 0 }, points: [{ x: 1, y: 2 }] };
  h.component.on_select_orbital(orbital);
  h.component.on_rays(rays);
  assert.equal(h.ray_paints.at(-1)[2], rays);
  const paints = h.ray_paints.length;
  h.component.on_seed_hover({ x: 0.5, y: 0.5 });
  h.tick();
  assert.equal(h.ray_paints.length, paints);
  const controls = h.component.render().children[0].children[2];
  assert.equal(controls.props.orbital, orbital);
  h.component.on_rays(rays); // A worker response during hover must also stay hidden.
  assert.equal(h.ray_paints.length, paints);
  h.component.on_seed_leave();
  assert.equal(h.ray_paints.length, paints + 1);
  assert.equal(h.ray_paints.at(-1)[2], rays);
});
