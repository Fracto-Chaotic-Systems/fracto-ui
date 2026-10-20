import FractoUtil from "@fracto/sdk/FractoUtil.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import {
  paint_survey_rays,
  ray_label_position,
} from "../src/pages/assets/surveys/SeedSurveyRayOverlay.js";

const harness = () => {
  const workers = [],
    overlays = [];
  const source = readFileSync(
    new URL("../src/pages/assets/surveys/SeedSurveyRays.jsx", import.meta.url),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace("export default class SeedSurveyRays", "class SeedSurveyRays")
    .replace("import.meta.url", '"https://example.com/SeedSurveyRays.jsx"');
  const type = () => type;
  type.isRequired = type;
  const Rays = vm.runInNewContext(
    transformSync(source, { loader: "jsx" }).code + "\nSeedSurveyRays",
    {
      React: {
        createElement: (type, props, ...children) => ({
          type,
          props,
          children,
        }),
      },
      PropTypes: new Proxy({}, { get: () => type }),
      Component: class {
        constructor(props) {
          this.props = props;
        }
        setState(update) {
          Object.assign(this.state, update);
        }
      },
      AppText: { get: (key) => key },
      RAY_TEXT_KEYS: new Proxy({}, { get: (_, key) => String(key) }),
      URL,
      Worker: class {
        constructor() {
          workers.push(this);
        }
        terminate() {
          this.terminated = true;
        }
        postMessage(data) {
          this.request = data;
        }
      },
    },
  );
  const props = {
    focal_point: { x: -1, y: 0 },
    orbital: { points: [{ x: -0.618, y: 0 }] },
    on_rays: (rays) => overlays.push(rays),
  };
  const component = new Rays(props);
  return { component, workers, overlays };
};
test("ray worker reports progress and caches completed selections", () => {
  const h = harness();
  h.component.trace();
  const worker = h.workers[0];
  const rays = [{ angle: { key: "1/3" }, points: [{ x: 1, y: 2 }] }];
  worker.onmessage({
    data: {
      id: worker.request.id,
      progress: { stage: "tracing", processed: 1, total: 2, rays },
    },
  });
  assert.equal(h.component.state.progress.processed, 1);
  assert.equal(h.overlays.at(-1), rays);
  worker.onmessage({
    data: { id: worker.request.id, result: { status: "rays_found", rays } },
  });
  assert.equal(worker.terminated, true);
  assert.equal(h.component.state.status, "rays_found");
  h.component.trace();
  assert.equal(h.workers.length, 1);
  assert.equal(h.overlays.at(-1), rays);
  h.component.toggle({ target: { checked: false } });
  assert.equal(h.overlays.at(-1).length, 0);
  h.component.toggle({ target: { checked: true } });
  assert.equal(h.overlays.at(-1), rays);
});
test("selection changes and cancellation suppress stale worker messages", () => {
  const h = harness();
  h.component.trace();
  const worker = h.workers[0],
    previous = h.component.props;
  h.component.props = {
    ...previous,
    orbital: { points: [{ x: 1.618, y: 0 }] },
  };
  h.component.componentDidUpdate(previous);
  worker.onmessage({
    data: {
      id: worker.request.id,
      result: { status: "rays_found", rays: [1] },
    },
  });
  assert.equal(worker.terminated, true);
  assert.equal(h.component.state.status, "running");
  assert.equal(h.workers.length, 2);
  assert.equal(h.workers[1].request.orbital, h.component.props.orbital);
  assert.equal(h.overlays.at(-1).length, 0);
  h.component.cancel();
  assert.equal(h.workers[1].terminated, true);
  assert.equal(h.component.state.status, "cancelled");
  h.component.trace();
  h.component.componentWillUnmount();
  assert.equal(h.workers[2].terminated, true);
});
test("missing selection and worker failures have explicit states", () => {
  const h = harness();
  h.component.props = { ...h.component.props, orbital: null };
  h.component.trace();
  assert.equal(h.component.state.status, "no_selection");
  assert.equal(h.workers.length, 0);
  h.component.props = {
    ...h.component.props,
    orbital: { points: [{ x: 1, y: 0 }] },
  };
  h.component.trace();
  h.workers[0].onerror();
  assert.equal(h.component.state.status, "failed");
});
test("ray overlay scales to canvas dimensions, clips, and restores context", () => {
  const calls = [];
  const context = Object.fromEntries(
    [
      "save",
      "restore",
      "beginPath",
      "rect",
      "clip",
      "moveTo",
      "lineTo",
      "stroke",
    ].map((name) => [name, (...args) => calls.push([name, ...args])]),
  );
  const rays = [
    {
      points: [
        { x: -1.5, y: 1.5 },
        { x: 0, y: 0 },
        { x: 1.5, y: -1.5 },
      ],
    },
  ];
  paint_survey_rays(context, { width: 550, height: 550 }, rays, 1.5);
  assert.deepEqual(
    calls.find((c) => c[0] === "moveTo"),
    ["moveTo", 0, 0],
  );
  assert.deepEqual(
    calls.filter((c) => c[0] === "lineTo"),
    [
      ["lineTo", 275, 275],
      ["lineTo", 550, 550],
    ],
  );
  assert.equal(calls.at(-1)[0], "restore");
  calls.length = 0;
  paint_survey_rays(context, { width: 200, height: 200 }, rays, 1.5);
  assert.deepEqual(
    calls.filter((c) => c[0] === "lineTo"),
    [
      ["lineTo", 100, 100],
      ["lineTo", 200, 200],
    ],
  );
});

test("angle labels follow the outer ray entry while staying fully inside the canvas", () => {
  const size = 550,
    half_span = 1.5,
    text_width = 42;
  const cases = [
    [
      [
        { x: 4, y: 0 },
        { x: 0, y: 0 },
      ],
      { x: 519, y: 275 },
    ],
    [
      [
        { x: -4, y: 0 },
        { x: 0, y: 0 },
      ],
      { x: 31, y: 275 },
    ],
    [
      [
        { x: 0, y: 4 },
        { x: 0, y: 0 },
      ],
      { x: 275, y: 15 },
    ],
    [
      [
        { x: 0, y: -4 },
        { x: 0, y: 0 },
      ],
      { x: 275, y: 535 },
    ],
    [
      [
        { x: -4, y: 0 },
        { x: 4, y: 0 },
      ],
      { x: 31, y: 275 },
    ],
  ];
  for (const [points, expected] of cases) {
    const actual = ray_label_position(
      points,
      size,
      size,
      half_span,
      text_width,
    );
    assert.ok(Math.abs(actual.x - expected.x) < 1e-9);
    assert.ok(Math.abs(actual.y - expected.y) < 1e-9);
  }
  assert.equal(
    ray_label_position(
      [
        { x: 4, y: 4 },
        { x: 3, y: 3 },
      ],
      size,
      size,
      half_span,
      text_width,
    ),
    null,
  );
});

test("overlay paints the exact fraction after the ray strokes", () => {
  const calls = [];
  const context = Object.fromEntries(
    [
      "save",
      "restore",
      "beginPath",
      "rect",
      "clip",
      "moveTo",
      "lineTo",
      "stroke",
      "fillRect",
      "strokeRect",
      "fillText",
    ].map((name) => [name, (...args) => calls.push([name, ...args])]),
  );
  context.measureText = () => ({ width: 42 });
  paint_survey_rays(
    context,
    { width: 550, height: 550 },
    [
      {
        angle: { key: "2/7" },
        points: [
          { x: 4, y: 0 },
          { x: 0, y: 0 },
        ],
      },
    ],
    1.5,
  );
  assert.deepEqual(
    calls.find((call) => call[0] === "fillText"),
    ["fillText", "2/7", 519, 275],
  );
  assert.ok(
    calls.findIndex((call) => call[0] === "fillRect") >
      calls.findLastIndex((call) => call[0] === "stroke"),
  );
  assert.equal(calls.at(-1)[0], "restore");
});

test("only table selection starts automatic tracing; deselection stops it", () => {
  const h = harness();
  const selected = h.component.props;
  h.component.props = { ...selected, orbital: null };
  h.component.componentDidMount();
  assert.equal(h.workers.length, 0);
  const previous = h.component.props;
  h.component.props = selected;
  h.component.componentDidUpdate(previous);
  assert.equal(h.workers.length, 1);
  h.component.componentDidUpdate({ ...selected }); // Hover rerenders keep the selected points.
  assert.equal(h.workers.length, 1);
  h.component.props = { ...selected, orbital: null };
  h.component.componentDidUpdate(selected);
  assert.equal(h.workers[0].terminated, true);
  assert.equal(h.component.state.status, "idle");
  assert.equal(h.overlays.at(-1).length, 0);
});

test("a preselected orbital traces on mount", () => {
  const h = harness();
  h.component.componentDidMount();
  assert.equal(h.workers.length, 1);
  assert.equal(h.component.state.status, "running");
});

test("orbital-colored rays have thin outlines and black fractions in bordered white boxes", () => {
  const strokes = [],
    labels = [];
  const context = {
    save() {},
    restore() {},
    beginPath() {},
    rect() {},
    clip() {},
    moveTo() {},
    lineTo() {},
    measureText: () => ({ width: 30 }),
    stroke() {
      strokes.push([this.strokeStyle, this.lineWidth]);
    },
    fillRect(...bounds) {
      labels.push(["box", this.fillStyle, ...bounds]);
    },
    strokeRect(...bounds) {
      labels.push(["border", this.strokeStyle, this.lineWidth, ...bounds]);
    },
    fillText() {
      labels.push(this.fillStyle);
    },
  };
  paint_survey_rays(
    context,
    { width: 550, height: 550 },
    [
      {
        angle: { key: "1/7" },
        points: [
          { x: 4, y: 0 },
          { x: 0, y: 0 },
        ],
      },
    ],
    1.5,
    3,
  );
  const orbital_color = FractoUtil.fracto_pattern_color(3);
  assert.deepEqual(strokes, [
    ["#000000", 2],
    [orbital_color, 1.25],
  ]);
  assert.deepEqual(labels, [
    ["box", "#ffffff", 506, 266, 38, 18],
    ["border", "#000000", 1, 506, 266, 38, 18],
    "#000000",
  ]);
});
