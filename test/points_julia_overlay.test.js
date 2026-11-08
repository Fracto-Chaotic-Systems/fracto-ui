import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { paint_survey_orbital_points } from "../src/pages/assets/surveys/SeedSurveyOrbitalOverlay.js";
import { paint_survey_rays } from "../src/pages/assets/surveys/SeedSurveyRayOverlay.js";

test("Julia orbital overlays restore the image, replace markers, and survive streamed paints", () => {
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
      paint_survey_rays: () => {},
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
    strokeRect: (...args) => calls.push(["square", ...args]),
  };
  const canvas = { width: 500, height: 500, getContext: () => context };
  const orbital = (re, im) => ({ points: [{ point: { re, im } }] });
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
  calls.length = 0;
  const selected = view.props;
  view.props = { ...selected, selected_orbital: null };
  view.componentDidUpdate(selected);
  assert.deepEqual(
    calls.map((call) => call[0]),
    ["restore"],
  );
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
