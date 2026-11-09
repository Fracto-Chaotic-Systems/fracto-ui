import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { paint_survey_orbital_points } from "../src/pages/assets/surveys/SeedSurveyOrbitalOverlay.js";
import { paint_survey_rays } from "../src/pages/assets/surveys/SeedSurveyRayOverlay.js";

test("Julia orbital overlays restore the image, replace markers, and survive streamed paints", () => {
  const active_points = [];
  let now = 0;
  let frame_id = 0;
  const frames = new Map();
  const source = readFileSync(
    new URL("../src/pages/study/points/PointsJuliaCanvas.jsx", import.meta.url),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace("export default class", "class");
  const Canvas = runInNewContext(
    transformSync(source, { loader: "jsx" }).code + ";PointsJuliaCanvas",
    {
      Component: class {
        constructor(props) {
          this.props = props;
        }
        setState(update, callback) {
          Object.assign(this.state, update);
          callback?.();
        }
      },
      React: {
        createElement: (type, props, ...children) => ({
          type,
          props,
          children,
        }),
      },
      SeedSurveyCanvas: "survey-canvas",
      PointsOrbitalRays: "orbital-rays",
      performance: { now: () => now },
      requestAnimationFrame: (callback) => { frames.set(++frame_id, callback); return frame_id; },
      cancelAnimationFrame: (id) => frames.delete(id),
      paint_survey_rays: (...args) => active_points.push(args[5]),
      paint_survey_orbital_points,
    },
  );
  const calls = [];
  let image = { frame: 1 };
  const context = {
    getImageData: () => image,
    putImageData: (...args) => calls.push(["restore", ...args]),
    save() {},
    restore() {},
    beginPath() {},
    fill() {},
    arc: (...args) => calls.push(["dot", ...args]),
    fillRect: (...args) => calls.push(["white-box", ...args]),
    strokeRect: (...args) => calls.push(["square", ...args]),
  };
  const canvas = { width: 500, height: 500, getContext: () => context };
  const orbital = (re, im) => ({ points: [{ point_index: 0, point: { re, im } }] });
  const view = new Canvas({
    selected_orbital: orbital("1", "1"),
    half_span: 2,
    trace_request: { requests: [] },
  });
  assert.equal(view.render().children[0].props.show_completion, false);
  assert.equal("trace_request" in view.render().children[0].props, false);
  assert.equal(
    view.render().children[1].props.trace_request,
    view.props.trace_request,
  );
  view.render().children[0].props.on_canvas_rendered(canvas);
  assert.deepEqual(
    calls.find((call) => call[0] === "square"),
    ["square", 372, 122, 6, 6],
  );
  assert.deepEqual(calls.find((call) => call[0] === "white-box"), ["white-box", 372, 122, 6, 6]);
  assert.deepEqual(calls.find((call) => call[0] === "dot").slice(0, 4), [
    "dot",
    375,
    125,
    1.5,
  ]);
  calls.length = 0;
  const previous = view.props;
  view.props = { ...previous, selected_orbital: orbital("-1", "-1") };
  view.componentDidUpdate(previous);
  assert.equal(calls[0][0], "restore");
  assert.equal(calls[0][1], image);
  assert.deepEqual(
    calls.find((call) => call[0] === "square"),
    ["square", 122, 372, 6, 6],
  );
  image = { frame: 2 };
  calls.length = 0;
  view.on_canvas_rendered(canvas);
  assert.equal(calls[0][1], image);
  assert.equal(calls.filter((call) => call[0] === "square").length, 1);
  const idle = view.props;
  view.props = { ...idle, animation_playing: true, active_point_index: 0 };
  view.componentDidUpdate(idle);
  assert.equal(active_points.at(-1), 0);
  now = 60;
  view.update_ray_opacities();
  assert.equal(view.ray_opacities.get(0), 0.5);
  now = 120;
  view.update_ray_opacities();
  assert.equal(view.ray_opacities.get(0), 1);
  assert.deepEqual(calls.filter((call) => call[0] === "square").at(-1), ["square", 120, 370, 10, 10]);
  assert.deepEqual(calls.filter((call) => call[0] === "white-box").at(-1), ["white-box", 120, 370, 10, 10]);
  const tracking = view.props;
  view.props = { ...tracking, active_point_index: 1 };
  view.componentDidUpdate(tracking);
  assert.equal(active_points.at(-1), 1);
  now = 180;
  view.update_ray_opacities();
  assert.equal(view.ray_opacities.get(0), 0.5);
  assert.equal(view.ray_opacities.get(1), 0.5);
  now = 240;
  view.update_ray_opacities();
  assert.equal(view.ray_opacities.has(0), false);
  assert.equal(view.ray_opacities.get(1), 1);
  const playing = view.props;
  view.props = { ...playing, animation_playing: false };
  view.componentDidUpdate(playing);
  assert.equal(active_points.at(-1), null);
  assert.equal(frames.size, 0);
  assert.deepEqual(calls.filter((call) => call[0] === "square").at(-1), ["square", 122, 372, 6, 6]);
  assert.equal("active_point_index" in view.render().children[0].props, false);
  assert.equal("animation_playing" in view.render().children[0].props, false);
  calls.length = 0;
  const selected = view.props;
  view.props = { ...selected, selected_orbital: null };
  view.componentDidUpdate(selected);
  assert.deepEqual(
    calls.map((call) => call[0]),
    ["restore"],
  );
});

test("animation hides inactive rays and fades complete ratio boxes, restoring opacity when stopped", () => {
  const calls = [], stack = [];
  const context = {
    globalAlpha: 1,
    save() { stack.push(this.globalAlpha); },
    restore() { this.globalAlpha = stack.pop(); },
    beginPath() {}, rect() {}, clip() {}, moveTo() {}, lineTo() {},
    stroke() { calls.push(["path", this.globalAlpha]); },
    fillRect() { calls.push(["box", this.globalAlpha]); },
    strokeRect() { calls.push(["border", this.globalAlpha]); },
    fillText(label) { calls.push([label, this.globalAlpha]); },
    measureText: () => ({ width: 20 }),
  };
  const rays = [0, 1, 1].map((point_index, index) => ({
    point_index, angle: { key: `${index}/7` },
    points: [{ x: 3, y: 0 }, { x: 0, y: 0 }],
  }));
  const canvas = { width: 500, height: 500 };
  paint_survey_rays(context, canvas, rays, 2, 2, 0);
  assert.deepEqual(calls.filter(([kind]) => kind === "path").map(([, alpha]) => alpha), [1, 1]);
  for (const kind of ["box", "border"]) {
    assert.deepEqual(calls.filter(([type]) => type === kind).map(([, alpha]) => alpha), [1]);
  }
  assert.deepEqual(calls.filter(([kind]) => kind.includes("/")), [["0/7", 1]]);
  assert.equal(context.globalAlpha, 1);
  calls.length = 0;
  paint_survey_rays(context, canvas, rays, 2, 2, 1);
  assert.deepEqual(calls.filter(([kind]) => kind.includes("/")), [["1/7", 1], ["2/7", 1]]);
  calls.length = 0;
  paint_survey_rays(context, canvas, rays, 2, 2, 1, new Map([[0, 0.5], [1, 0.5]]));
  assert.ok(calls.every(([, alpha]) => alpha === 0.5));
  assert.equal(context.globalAlpha, 1);
  calls.length = 0;
  paint_survey_rays(context, canvas, rays, 2, 2, 1, new Map());
  assert.equal(calls.length, 0);
  calls.length = 0;
  paint_survey_rays(context, canvas, rays, 2, 2);
  assert.ok(calls.every(([, alpha]) => alpha === 1));
  assert.equal(context.globalAlpha, 1);
});

test("shared paths and ratio labels paint below squares, survive image batches, and reject obsolete selections", () => {
  const source = readFileSync(
    new URL("../src/pages/study/points/PointsJuliaCanvas.jsx", import.meta.url),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace("export default class", "class");
  const Canvas = runInNewContext(
    transformSync(source, { loader: "jsx" }).code + ";PointsJuliaCanvas",
    {
      Component: class {
        constructor(props) {
          this.props = props;
        }
        setState(update, callback) {
          Object.assign(this.state, update);
          callback?.();
        }
      },
      React: {
        createElement: (type, props, ...children) => ({
          type,
          props,
          children,
        }),
      },
      SeedSurveyCanvas: "canvas",
      PointsOrbitalRays: "rays",
      paint_survey_rays,
      paint_survey_orbital_points,
    },
  );
  const calls = [];
  const context = {
    getImageData: () => ({}),
    putImageData: () => calls.push(["image"]),
    save() {},
    restore() {},
    beginPath() {},
    rect() {},
    clip() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    fill() {},
    fillRect() {},
    stroke() {
      calls.push(["stroke", this.strokeStyle, this.lineWidth]);
    },
    strokeRect(x, y, width, height) {
      if (width === 6 && height === 6) calls.push(["square"]);
    },
    fillText: (text) => calls.push(["label", text]),
    measureText: (text) => ({ width: text.length * 7 }),
  };
  const canvas = { width: 500, height: 500, getContext: () => context };
  const view = new Canvas({
    selected_orbital: {
      orbital_id: "1",
      period: 1,
      points: [{ point: { re: "1", im: "0" } }],
    },
    trace_request: { orbital_id: "1" },
    half_span: 2,
  });
  view.on_canvas_rendered(canvas);
  const old_callback = view.render().children[1].props.on_rays;
  const ray = {
    angle: { key: "0/1" },
    points: [
      { x: 3, y: 0 },
      { x: 1, y: 0 },
    ],
  };
  calls.length = 0;
  old_callback([ray]);
  assert.equal(calls[0][0], "image");
  assert.deepEqual(
    calls.filter((call) => call[0] === "stroke").map((call) => call[2]),
    [1.6, 1.25],
  );
  assert.ok(
    calls.findIndex((call) => call[0] === "label") <
      calls.findIndex((call) => call[0] === "square"),
  );
  assert.deepEqual(
    calls.find((call) => call[0] === "label"),
    ["label", "0/1"],
  );
  calls.length = 0;
  view.on_canvas_rendered(canvas);
  assert.equal(calls.filter((call) => call[0] === "label").length, 1);
  const previous = view.props;
  view.props = {
    ...previous,
    trace_request: { orbital_id: "2" },
    selected_orbital: {
      orbital_id: "2",
      period: 1,
      points: [{ point: { re: "-1", im: "0" } }],
    },
  };
  calls.length = 0;
  view.componentDidUpdate(previous);
  assert.equal(calls.filter((call) => call[0] === "label").length, 0);
  old_callback([ray]);
  assert.equal(calls.filter((call) => call[0] === "label").length, 0);
});
