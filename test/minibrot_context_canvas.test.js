import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import { paint_canvas_rays } from "../src/utils/render/FractoRayOverlay.js";
function harness({ defer_state = false } = {}) {
  const pending = [];
  const workers = [],
    paints = [],
    restored = [];
  const source = readFileSync(
    new URL(
      "../src/pages/study/minibrots/MinibrotContextCanvas.jsx",
      import.meta.url,
    ),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace(
      "export default class MinibrotContextCanvas",
      "class MinibrotContextCanvas",
    )
    .replace("import.meta.url", '"https://example.com/canvas.jsx"');
  const prop = () => prop;
  prop.isRequired = prop;
  const C = vm.runInNewContext(
    transformSync(source, { loader: "jsx" }).code + ";MinibrotContextCanvas",
    {
      Component: class {
        constructor(props) {
          this.props = props;
        }
        setState(u, callback) {
          const commit = () => {
            Object.assign(this.state, u);
            callback?.();
          };
          if (defer_state) pending.push(commit);
          else commit();
        }
      },
      React: {
        createElement: (type, props, ...children) => ({
          type,
          props,
          children,
        }),
      },
      PropTypes: new Proxy({}, { get: () => prop }),
      URL,
      Worker: class {
        constructor() {
          workers.push(this);
        }
        postMessage(data) {
          this.request = data;
        }
        terminate() {
          this.terminated = true;
        }
      },
      paint_canvas_rays: (...args) => paints.push(args),
      FractoUtil: { fracto_pattern_color: (period) => `pattern-${period}` },
      AppText: { get: (k) => k },
      MINIBROT_RAY_TEXT: new Proxy({}, { get: (_target, key) => String(key) }),
      KEY_STUDY_MINIBROT_CONTEXT_CANVAS: "canvas",
      FractoRasterImage: () => {},
      MinibrotRayTable: () => {},
      IMAGE_FRAME_STYLE: {},
    },
  );
  const component = new C({
    core_point: { x: -1, y: 0 },
    period: 2,
    focal_point: { x: -1.1, y: 0.1 },
    scope: 2,
  });
  const base = { pixels: "base" };
  const context = {
    canvas: { width: 500, height: 500 },
    getImageData: () => base,
    putImageData: (...a) => restored.push(a),
  };
  return {
    component,
    workers,
    paints,
    context,
    base,
    restored,
    flush: () => {
      while (pending.length) pending.shift()();
    },
  };
}
const rays = [
  {
    angle: { key: "2/5" },
    points: [
      { x: -1.2, y: 0.2 },
      { x: -1.25, y: 0 },
    ],
  },
];
test("worker receives the parent period and half-pixel tolerance", () => {
  const h = harness();
  h.component.componentDidMount();
  assert.equal(h.workers[0].request.period, 2);
  assert.equal(h.workers[0].request.tolerance, 0.002);
  assert.equal(h.workers[0].request.core_point.x, -1);
});
test("early ray results wait for the raster, then draw translated white rays on the base", () => {
  const h = harness();
  h.component.componentDidMount();
  h.workers[0].onmessage({ data: { result: { status: "complete", rays } } });
  assert.equal(h.paints.length, 0);
  assert.equal(h.workers[0].terminated, true);
  h.component.on_complete([], h.context);
  assert.equal(h.restored[0][0], h.base);
  const p = h.paints[0];
  assert.equal(p[4], "#ffffff");
  assert.equal(p[3], 1);
  assert.ok(Math.abs(p[2][0].points[0].x + 0.1) < 1e-12);
  assert.ok(Math.abs(p[2][0].points[0].y - 0.1) < 1e-12);
  assert.equal(rays[0].points[0].x, -1.2);
  h.component.paint();
  assert.equal(h.restored.length, 2);
});
test("late results paint immediately and unmount suppresses stale worker/raster callbacks", () => {
  const h = harness();
  h.component.componentDidMount();
  h.component.on_complete([], h.context);
  h.workers[0].onmessage({ data: { result: { status: "complete", rays } } });
  assert.equal(h.paints.at(-1)[2].length, 1);
  h.component.componentWillUnmount();
  const count = h.paints.length;
  h.workers[0].onmessage({ data: { result: { status: "complete", rays } } });
  h.component.on_complete([], h.context);
  assert.equal(h.paints.length, count);
  assert.equal(h.component.canvas_context, null);
});
test("unmount terminates an in-flight trace", () => {
  const h = harness();
  h.component.componentDidMount();
  h.component.componentWillUnmount();
  assert.equal(h.workers[0].terminated, true);
});
test("white rays use dark outlines and black fraction labels in white bordered edge boxes", () => {
  const calls = [],
    context = {};
  for (const method of [
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
  ])
    context[method] = (...args) =>
      calls.push({
        method,
        args,
        color: method === "stroke" ? context.strokeStyle : context.fillStyle,
      });
  context.measureText = () => ({ width: 30 });
  paint_canvas_rays(
    context,
    { width: 500, height: 500 },
    [
      {
        angle: { key: "2/5" },
        points: [
          { x: -3, y: 1 },
          { x: 0, y: 0 },
        ],
      },
    ],
    1.5,
  );
  for (const color of ["#ffffff", "#000000"])
    assert.ok(calls.some((c) => c.method === "stroke" && c.color === color));
  assert.ok(
    calls.some((c) => c.method === "fillRect" && c.color === "#ffffff"),
  );
  assert.ok(calls.some((c) => c.method === "strokeRect"));
  const label = calls.find((c) => c.method === "fillText");
  assert.equal(label.args[0], "2/5");
  assert.equal(label.color, "#000000");
  assert.ok(label.args[1] < 50);
});

test("worker failure stops calculation and exposes an unavailable message", () => {
  const h = harness();
  h.component.componentDidMount();
  h.workers[0].onerror();
  assert.equal(h.component.state.status, "unavailable");
  assert.equal(h.workers[0].terminated, true);
  assert.equal(h.component.worker, null);
});

test("partial results identify the failed group and preserve the verified overlay", () => {
  for (const [root_status, doubling_status, expected_label] of [
    ["complete", "trace_budget", "doubling_label"],
    ["angles_unresolved", "complete", "root_access_label"],
  ]) {
    const h = harness();
    h.component.componentDidMount();
    h.component.on_complete([], h.context);
    h.workers[0].onmessage({
      data: {
        result: {
          status: "partial",
          rays,
          root_access: { status: root_status },
          doubling: { status: doubling_status },
        },
      },
    });
    const reasons = h.component.render_partial_reasons();
    assert.equal(reasons.length, 1);
    assert.ok(JSON.stringify(reasons).includes(expected_label));
    assert.ok(
      JSON.stringify(reasons).includes(
        root_status === "complete" ? doubling_status : root_status,
      ),
    );
    assert.equal(h.paints.at(-1)[2].length, 1);
  }
});

test("unlanded prefixes are painted and explicitly identified as incomplete", () => {
  const h = harness();
  h.component.componentDidMount();
  h.component.on_complete([], h.context);
  const prefixes = rays.map((ray) => ({
    ...ray,
    landed: false,
    status: "incomplete",
    stop_reason: "trace_budget",
  }));
  h.workers[0].onmessage({
    data: {
      result: {
        status: "partial",
        rays: prefixes,
        root_access: { status: "incomplete" },
        doubling: { status: "complete" },
      },
    },
  });
  assert.equal(h.paints.at(-1)[2][0].landed, false);
  assert.equal(h.paints.at(-1)[2][0].points.length, prefixes[0].points.length);
  assert.equal(h.component.state.status, "partial");
  assert.ok(
    JSON.stringify(h.component.render_partial_reasons()).includes("incomplete"),
  );
});

test("third-period failures are named independently without clearing other paths", () => {
  const h = harness();
  h.component.componentDidMount();
  h.component.on_complete([], h.context);
  h.workers[0].onmessage({
    data: {
      result: {
        status: "partial",
        rays,
        root_access: { status: "complete" },
        doubling: { status: "complete" },
        thirds: {
          "1/3": { status: "incomplete" },
          "2/3": { status: "root_angles_required" },
        },
      },
    },
  });
  const reasons = h.component.render_partial_reasons();
  assert.equal(reasons.length, 2);
  const text = JSON.stringify(reasons);
  assert.ok(text.includes("third_one_label"));
  assert.ok(text.includes("third_two_label"));
  assert.ok(text.includes("root_angles_required"));
  assert.equal(h.paints.at(-1)[2].length, 1);
});
test("the canvas worker enables both third-period wake groups", () => {
  const source = readFileSync(
    new URL(
      "../src/pages/study/minibrots/MinibrotRays.worker.js",
      import.meta.url,
    ),
    "utf8",
  ).replace(/^import[\s\S]*?;\r?\n/gm, "");
  const messages = [],
    self = { postMessage: (data) => messages.push(data) };
  vm.runInNewContext(source, {
    self,
    find_minibrot_rays: (_core, period, options) => {
      assert.equal(period, 2);
      assert.equal(options.include_thirds, true);
      assert.equal(options.include_tip, true);
      assert.equal(options.tolerance, 0.002);
      options.on_progress("third_tracing");
      return { status: "complete", rays: [] };
    },
  });
  self.onmessage({
    data: { core_point: { x: -1, y: 0 }, period: 2, tolerance: 0.002 },
  });
  assert.equal(messages[0].progress, "third_tracing");
  assert.equal(messages[1].result.status, "complete");
});

test("row selection colors only the selected wake using its resulting period", () => {
  const h = harness();
  h.component.props.period = 9;
  h.component.componentDidMount();
  h.component.on_complete(null, h.context);
  const ray = (key) => ({
    angle: { key },
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
  });
  const groups = {
    "0/1": { rays: [ray("1/511")] },
    "1/2": { rays: [ray("1/262143")] },
    "1/3": { rays: [ray("1/134217727")] },
    "2/3": { rays: [ray("5/134217727")] },
  };
  h.workers[0].onmessage({
    data: {
      result: {
        status: "complete",
        rays: Object.values(groups).flatMap((group) => group.rays),
        root_access: groups["0/1"],
        doubling: groups["1/2"],
        thirds: { "1/3": groups["1/3"], "2/3": groups["2/3"] },
      },
    },
  });
  assert.equal(h.component.state.selected_relative, "antenna_tip");
  h.component.select_relative("0/1");
  assert.equal(h.paints.at(-1)[4], "pattern-9");
  for (const [relative, period] of [
    ["1/2", 18],
    ["1/3", 27],
    ["2/3", 27],
  ]) {
    h.component.select_relative(relative);
    assert.equal(h.paints.at(-1)[4], `pattern-${period}`);
    assert.equal(
      h.paints.at(-1)[2][0].angle.key,
      groups[relative].rays[0].angle.key,
    );
    assert.equal(h.paints.at(-2)[4], "#ffffff");
    assert.equal(h.paints.at(-2)[5], false);
    assert.notEqual(h.paints.at(-1)[5], false);
    assert.equal(h.paints.at(-2)[2].length, 4);
  }
});

test("hiding ray labels preserves outlined paths without drawing fraction boxes", () => {
  const strokes = [],
    labels = [];
  let restored = false;
  const context = new Proxy(
    {
      stroke() {
        strokes.push(this.strokeStyle);
      },
      fillText(text) {
        labels.push(text);
      },
      fillRect() {
        assert.fail("unselected rays must not draw label boxes");
      },
      restore() {
        restored = true;
      },
      measureText() {
        assert.fail("hidden labels must not be measured");
      },
    },
    { get: (target, key) => target[key] || (() => {}) },
  );
  paint_canvas_rays(
    context,
    { width: 500, height: 500 },
    [
      {
        angle: { key: "1/7" },
        points: [
          { x: -2, y: 0 },
          { x: 0, y: 0 },
        ],
      },
    ],
    1,
    "#ffffff",
    false,
  );
  assert.deepEqual(strokes, ["#000000", "#ffffff"]);
  assert.deepEqual(labels, []);
  assert.equal(restored, true);
});

for (const raster_first of [true, false]) {
  test(`deferred worker state colors default selection when raster is ${raster_first ? "ready" : "pending"}`, () => {
    const h = harness({ defer_state: true });
    h.component.componentDidMount();
    if (raster_first) h.component.on_complete(null, h.context);
    h.paints.length = 0;
    h.workers[0].onmessage({
      data: {
        result: {
          status: "complete",
          rays,
          root_access: { status: "complete", rays },
          antenna_tip: { status: "complete", rays },
        },
      },
    });
    assert.equal(h.paints.length, 0, "paint must wait for committed groups");
    h.flush();
    if (!raster_first) {
      assert.equal(h.paints.length, 0);
      h.component.on_complete(null, h.context);
    }
    assert.equal(h.component.state.selected_relative, "antenna_tip");
    assert.equal(h.paints.at(-1)[4], "pattern-2");
    assert.equal(h.paints.at(-1)[2][0].angle.key, rays[0].angle.key);
    assert.equal(h.paints.at(-2)[5], false);
  });
}

test("antenna tip selection highlights its own paths and reports independent failures", () => {
  const h = harness();
  h.component.componentDidMount();
  h.component.on_complete(null, h.context);
  h.workers[0].onmessage({
    data: {
      result: {
        status: "partial",
        rays,
        root_access: { status: "complete", rays: [] },
        antenna_tip: { status: "incomplete", rays },
      },
    },
  });
  h.component.select_relative("antenna_tip");
  assert.equal(h.paints.at(-1)[4], "pattern-2");
  assert.equal(h.paints.at(-1)[2][0].angle.key, "2/5");
  const reasons = h.component.render_partial_reasons();
  assert.ok(reasons.some((reason) => reason.props.key === "tip_label"));
});
