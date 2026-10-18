import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";

const harness = (Q = { x: 0, y: 0 }) => {
  const calls = [],
    newton_calls = [],
    charts = [],
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
      return { point_list: [{ re: "1", im: "2" }, { re: "3", im: "4" }] };
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
    AppText: { get: (key) => key },
    KEY_ASSETS_SURVEYS_DETECT: "detect",
    KEY_ASSETS_SURVEYS_CANVAS_DETECT: "detect-canvas",
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
  return { component, focal_point, calls, newton_calls, charts, frames, tick };
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
    precision_digits: 64, seed: { x: 0, y: 0 },
  });
  h.component.render();
  assert.deepEqual(JSON.parse(JSON.stringify(h.charts.at(-1)[1])), [{ x: 1, y: 2 }, { x: 3, y: 4 }]);
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
  const metadata = h.component.render().children[1].children[1];
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
  h.component.state.newton = { point_list: [{ re: 4, im: 5 }] };
  assert.equal(h.component.orbital_details().magnitude, 5);
  h.component.state.calculation = { pattern: 0 };
  assert.equal(h.component.orbital_details().magnitude, null);
  assert.equal(
    h.component.render().children[1].children[1].children[1].children[0],
    "pattern: 0",
  );
});

 test("missing Newton points never fall back to calculator points", () => {
  const h = harness();
  h.component.componentDidMount();
  h.component.state.newton = { point_list: [] };
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
    fill() { calls.push(this.fillStyle); },
    stroke() { calls.push([this.strokeStyle, this.lineWidth]); },
    restore: () => calls.push("restore"),
  };
  const canvas = { width: 550, height: 550, getContext: () => context };
  const props = h.component.render().children[0].children[0].props;
  assert.equal(props.on_canvas_rendered, h.component.draw_Q);
  props.on_canvas_rendered(canvas);
  assert.deepEqual(calls, ["save", "begin", [412.5, 137.5, 4, 0, 2 * Math.PI], "#ffffff", ["#000000", 1], "restore"]);
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
    getImageData: () => ({}), putImageData: () => { restores++; arcs.length = 0; squares.length = 0; },
    save() {}, restore() {}, beginPath() {}, fill() {}, stroke() {},
    arc: (...args) => arcs.push(args),
    strokeRect(...args) { squares.push([this.strokeStyle, this.lineWidth, ...args]); },
  };
  h.component.draw_Q({ width: 550, height: 550, getContext: () => context });
  h.component.on_seed_hover({ x: 0.5, y: 0.25 });
  h.tick();
  assert.equal(arcs.length, 3);
  assert.equal(arcs[0][2], 1.5);
  assert.equal(arcs.at(-1)[2], 4, "Q is larger and drawn after orbital dots");
  assert.equal(squares.length, 2);
  assert.deepEqual(squares[0], ["#000000", 1, arcs[0][0] - 2, arcs[0][1] - 2, 4, 4]);
  h.component.state.newton = { point_list: [] };
  h.component.paint_overlay();
  assert.equal(arcs.length, 1, "missing chart clears orbital dots, retaining Q");
  assert.equal(squares.length, 0);
  h.component.on_seed_hover({ x: 1, y: 1 });
  h.component.on_seed_leave();
  assert.equal(h.frames.size, 0);
  assert.equal(arcs.length, 1);
  assert.ok(restores >= 4);
});
