import test from "node:test";
import { setImmediate } from "node:timers";
import {
  best_ray_group,
  cached_ray_result,
  merge_ray_cache,
  RAY_CACHE_GROUPS,
} from "../../../sdk/orbitals/FractoMinibrotRayCache.js";
import { format_minibrot_angle } from "../src/pages/study/minibrots/MinibrotRayLabels.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import { paint_canvas_rays } from "../src/utils/render/FractoRayOverlay.js";
function harness({
  defer_state = false,
  cache = null,
  load_error = false,
} = {}) {
  const saves = [];
  const pending = [];
  const timer_callbacks = [],
    stopped_timers = [];
  let clock = 1000;
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
      Date: { now: () => clock },
      setInterval: (callback) => {
        timer_callbacks.push(callback);
        return 1;
      },
      clearInterval: (id) => stopped_timers.push(id),
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
      best_ray_group,
      cached_ray_result,
      MinibrotRayStorage: class {
        constructor(props) {
          this.props = props;
        }
        async load() {
          if (load_error) throw Error("offline");
          return await cache;
        }
        async save(group, result) {
          saves.push({ group, result });
        }
      },
      format_minibrot_angle,
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
    saves,
    tick: (seconds) => {
      clock += seconds * 1000;
      timer_callbacks.at(-1)?.();
    },
    stopped_timers,
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
  assert.equal(messages[0].progress, "attachment");
  assert.equal(messages[1].progress, "third_tracing");
  assert.equal(messages[2].result.status, "complete");
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

test("exponential labels expand reduced fractions exactly for every group", () => {
  const angle = { numerator: "1", denominator: "3", key: "1/3" };
  assert.equal(format_minibrot_angle(angle, 2, "0/1"), "1/(2²−1)");
  assert.equal(format_minibrot_angle(angle, 2, "1/2"), "5/(2⁴−1)");
  assert.equal(format_minibrot_angle(angle, 2, "1/3"), "21/(2⁶−1)");
  assert.equal(format_minibrot_angle(angle, 2, "2/3"), "21/(2⁶−1)");
  assert.equal(
    format_minibrot_angle(
      { numerator: "5", denominator: "12", key: "5/12" },
      2,
      "antenna_tip",
    ),
    "5/(2²(2²−1))",
  );
  assert.equal(
    format_minibrot_angle(
      { numerator: "1", denominator: "2", key: "1/2" },
      1,
      "antenna_tip",
    ),
    "1/(2¹(2¹−1))",
  );
  const d = (1n << 60n) - 1n;
  assert.equal(
    format_minibrot_angle(
      { numerator: "1", denominator: String(d), key: `1/${d}` },
      20,
      "1/3",
    ),
    "1/(2⁶⁰−1)",
  );
  assert.equal(format_minibrot_angle(angle, 3, "0/1"), "1/3");
  assert.equal(angle.key, "1/3");
});

test("worker announces high precision before a higher-period calculation", () => {
  const source = readFileSync(
    new URL(
      "../src/pages/study/minibrots/MinibrotRays.worker.js",
      import.meta.url,
    ),
    "utf8",
  ).replace(/^import[\s\S]*?;\r?\n/gm, "");
  const messages = [],
    self = { postMessage: (message) => messages.push(message) };
  vm.runInNewContext(source, {
    self,
    find_minibrot_rays: () => ({ status: "complete", rays: [] }),
  });
  self.onmessage({
    data: { core_point: { x: 0, y: 0 }, period: 32, tolerance: 0.001 },
  });
  assert.equal(messages[0].progress, "precision_calculating");
  assert.equal(messages.at(-1).result.status, "complete");
});

test("elapsed progress updates independently and stops on result, failure and unmount", () => {
  for (const finish of ["result", "error", "unmount"]) {
    const h = harness();
    h.component.componentDidMount();
    h.tick(7);
    assert.equal(h.component.state.elapsed_seconds, 7);
    assert.equal(h.component.state.calculating, true);
    if (finish === "result")
      h.workers[0].onmessage({
        data: { result: { status: "complete", rays: [] } },
      });
    if (finish === "error") h.workers[0].onerror();
    if (finish === "unmount") h.component.componentWillUnmount();
    assert.ok(h.stopped_timers.includes(1));
    if (finish !== "unmount")
      assert.equal(h.component.state.calculating, false);
  }
});

const flush_async = () => new Promise((resolve) => setImmediate(resolve));
function saved_cache() {
  const group = {
    status: "complete",
    root: { x: -1.25, y: 0 },
    rays: ["2/5", "3/5"].map((key) => ({
      angle: {
        key,
        numerator: key[0],
        denominator: "5",
        value: Number(key[0]) / 5,
      },
      points: [
        { x: -2, y: 0 },
        { x: -1.25, y: 0 },
      ],
      landed: true,
      endpoint_error: 0.001,
    })),
  };
  return RAY_CACHE_GROUPS.reduce(
    (cache, id) => merge_ray_cache(cache, { x: -1, y: 0 }, 2, id, group, 0.002),
    null,
  );
}
test("complete saved paths paint without starting a worker", async () => {
  const h = harness({ cache: saved_cache() });
  h.component.props.minibrot_id = 7;
  h.component.componentDidMount();
  h.component.on_complete(null, h.context);
  await flush_async();
  assert.equal(h.workers.length, 0);
  assert.equal(h.component.state.calculating, false);
  assert.equal(h.component.state.cache_status, "cache_loaded");
  assert.ok(h.paints.length > 0);
});
test("partial cache is displayed and passed to the worker; calculated groups are saved", async () => {
  const cache = saved_cache();
  delete cache.groups.antenna_tip;
  const h = harness({ cache });
  h.component.props.minibrot_id = 7;
  h.component.componentDidMount();
  await flush_async();
  assert.equal(h.workers.length, 1);
  assert.equal(h.workers[0].request.cache, cache);
  assert.equal(h.component.state.calculating, true);
  h.workers[0].onmessage({
    data: {
      group: { id: "antenna_tip", result: cache.groups.doubling.result },
    },
  });
  await flush_async();
  assert.equal(h.saves.length, 1);
  assert.equal(h.saves[0].group, "antenna_tip");
  assert.equal(h.component.state.cache_status, "cache_saved");
});
test("storage failures fall back to calculation and late cache reads cannot restart an unmounted view", async () => {
  const h = harness({ load_error: true });
  h.component.props.minibrot_id = 7;
  h.component.componentDidMount();
  await flush_async();
  assert.equal(h.workers.length, 1);
  assert.equal(h.component.state.cache_status, "cache_load_failed");
  let resolve;
  const cache = new Promise((done) => (resolve = done));
  const stale = harness({ cache });
  stale.component.props.minibrot_id = 7;
  stale.component.componentDidMount();
  stale.component.componentWillUnmount();
  resolve(saved_cache());
  await flush_async();
  assert.equal(stale.workers.length, 0);
});
test("queued cache saves retain their original record and continue after an earlier failure", async () => {
  const source = readFileSync(
    new URL(
      "../src/pages/study/minibrots/MinibrotRayStorage.js",
      import.meta.url,
    ),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace(
      "export default class MinibrotRayStorage",
      "class MinibrotRayStorage",
    );
  const calls = [];
  const Storage = vm.runInNewContext(source + ";MinibrotRayStorage", {
    RAY_CACHE_VERSION: "v1",
    DataBackend: {
      save_minibrot_ray_paths: async (id, payload) => {
        calls.push({ id, payload });
        if (calls.length === 1) throw Error("transient");
      },
    },
  });
  const props = {
    minibrot_id: 7,
    core_point: { x: -1, y: 0 },
    period: 2,
    scope: 2,
  };
  const storage = new Storage(props);
  const first = storage.save("root_access", {}).catch(() => {});
  const second = storage.save("doubling", {});
  props.minibrot_id = 8;
  await Promise.all([first, second]);
  assert.deepEqual(
    calls.map((call) => call.id),
    [7, 7],
  );
  assert.equal(calls[1].payload.group, "doubling");
});

test("wheel uses Navigator factors without changing saved settings or restarting rays", () => {
  const h = harness();
  h.component.componentDidMount();
  let prevented = 0;
  const wheel = (deltaY, modifiers = {}) =>
    h.component.on_wheel({
      deltaY,
      preventDefault: () => prevented++,
      ...modifiers,
    });
  wheel(-1);
  assert.equal(h.component.state.scope, 2 / 1.5);
  wheel(1);
  assert.equal(h.component.state.scope, 2);
  wheel(-1, { shiftKey: true });
  assert.equal(h.component.state.scope, 2 / 1.618 ** 2);
  wheel(1, { shiftKey: true });
  wheel(-1, { shiftKey: true, altKey: true });
  assert.equal(h.component.state.scope, 2 / 1.618);
  assert.equal(prevented, 5);
  assert.equal(h.component.props.scope, 2);
  assert.equal(h.workers.length, 1);
});

test("click recenters the visible canvas and rejects stale raster completions", () => {
  const h = harness();
  h.component.componentDidMount();
  h.component.on_complete(null, h.context);
  h.component.canvas_wrapper = {
    querySelector: () => ({
      getBoundingClientRect: () => ({
        left: 10,
        top: 20,
        width: 250,
        height: 250,
      }),
    }),
  };
  h.component.on_click({ clientX: 197.5, clientY: 82.5 });
  assert.ok(Math.abs(h.component.state.focal_point.x + 0.6) < 1e-12);
  assert.ok(Math.abs(h.component.state.focal_point.y - 0.6) < 1e-12);
  assert.equal(h.component.props.focal_point.x, -1.1);
  assert.equal(h.component.base, null);
  h.component.on_complete(null, h.context, 0);
  assert.equal(h.component.base, null);
  h.component.on_complete(null, h.context, 1);
  assert.equal(h.component.base, h.base);
  h.component.rays = rays;
  h.component.paint();
  assert.ok(Math.abs(h.paints.at(-1)[2][0].points[0].x + 0.6) < 1e-12);
  assert.ok(Math.abs(h.paints.at(-1)[2][0].points[0].y + 0.4) < 1e-12);
});

test("wheel listener prevents scrolling and is cleaned up on unmount", () => {
  const h = harness(),
    added = [],
    removed = [];
  const element = {
    addEventListener: (...args) => added.push(args),
    removeEventListener: (...args) => removed.push(args),
  };
  h.component.componentDidMount();
  h.component.set_canvas_wrapper(element);
  assert.equal(added[0][0], "wheel");
  assert.equal(added[0][2].passive, false);
  h.component.set_canvas_wrapper(element);
  assert.equal(removed.length, 1);
  h.component.componentWillUnmount();
  assert.equal(removed.length, 2);
  assert.equal(removed[1][1], added[0][1]);
});

for (const raster_first of [true, false]) {
  test(`cached and arriving groups remain visible during calculation (raster first: ${raster_first})`, async () => {
    const cache = saved_cache();
    delete cache.groups.antenna_tip;
    const h = harness({ cache });
    h.component.props.minibrot_id = 7;
    h.component.componentDidMount();
    if (raster_first) h.component.on_complete(null, h.context);
    await flush_async();
    if (!raster_first) h.component.on_complete(null, h.context);
    assert.ok(h.paints.at(-1)[2].length > 0);
    assert.equal(h.component.state.calculating, true);
    h.workers[0].onmessage({ data: { progress: "tip_tracing" } });
    const group = structuredClone(cache.groups.doubling.result);
    group.rays = group.rays.map((ray) => ({
      ...ray,
      angle: { key: "1/7", numerator: "1", denominator: "7" },
    }));
    h.workers[0].onmessage({
      data: { group: { id: "antenna_tip", result: group } },
    });
    assert.equal(h.component.state.status, "tip_tracing");
    assert.equal(h.component.state.calculating, true);
    assert.ok(h.component.rays.some((ray) => ray.angle.key === "2/5"));
    assert.equal(h.paints.at(-1)[2][0].angle.key, "1/7");
    assert.equal(h.paints.at(-1)[4], "pattern-2");
    h.workers[0].onmessage({
      data: { result: { status: "unresolved", rays: [] } },
    });
    assert.ok(h.component.rays.length > 0);
    assert.equal(h.component.state.status, "partial");
    assert.equal(h.component.state.calculating, false);
  });
}

test("navigation retains the displayed frame until the latest hidden raster completes", () => {
  const h = harness();
  h.component.componentDidMount();
  const frames = [];
  const display = {
    canvas: { width: 500, height: 500 },
    getImageData: () => h.base,
    putImageData: (...args) => frames.push(args),
  };
  h.component.active = false;
  h.component.set_display_canvas({ getContext: () => display });
  h.component.active = true;
  h.component.on_complete(null, h.context);
  assert.equal(h.component.canvas_context, display);
  assert.equal(frames.length, 1);
  h.component.change_view({ x: 0, y: 0 }, 1);
  assert.equal(frames.length, 1, "the previous image is not cleared");
  h.component.change_view({ x: 0.1, y: 0.2 }, 0.5);
  h.component.on_complete(null, h.context, 1);
  assert.equal(
    frames.length,
    1,
    "an obsolete refresh cannot replace the frame",
  );
  const next = { pixels: "updated" };
  h.component.on_complete(null, { getImageData: () => next }, 2);
  assert.equal(frames.length, 2);
  assert.equal(frames[1][0], next);
  assert.equal(h.component.canvas_context, display);
  h.component.componentWillUnmount();
  assert.equal(h.component.display_context, null);
});

test("previous-run rays display before the initial raster while missing groups calculate", async () => {
  const cache = saved_cache();
  delete cache.groups.antenna_tip;
  const h = harness({ cache });
  h.component.props.minibrot_id = 7;
  h.component.set_display_canvas({ getContext: () => h.context });
  h.component.componentDidMount();
  await flush_async();
  assert.equal(h.workers.length, 1);
  assert.equal(h.component.state.calculating, true);
  assert.ok(
    h.paints.some((call) => call[2].some((ray) => ray.angle.key === "2/5")),
  );
  const count = h.paints.length;
  h.workers[0].onmessage({ data: { progress: "tip_tracing" } });
  assert.equal(h.paints.length, count);
  assert.ok(h.component.rays.length > 0);
  h.component.on_complete(null, h.context);
  assert.ok(h.paints.length > count);
  assert.equal(h.component.state.calculating, true);
});

test("saving an unsuccessful calculation never claims ray paths were saved", async () => {
  const h = harness();
  h.component.props.minibrot_id = 7;
  h.component.componentDidMount();
  await flush_async();
  h.workers[0].onmessage({
    data: {
      group: {
        id: "root_access",
        result: { status: "angles_unresolved", rays: [] },
      },
    },
  });
  await flush_async();
  assert.equal(h.component.state.cache_status, "cache_no_paths");
  assert.equal(h.component.rays.length, 0);
});

test("an empty final result exposes individual group failures", () => {
  const h = harness();
  h.component.componentDidMount();
  h.workers[0].onmessage({
    data: {
      result: {
        status: "angles_unresolved",
        rays: [],
        root_access: { status: "angles_unresolved", rays: [] },
        doubling: { status: "calculation_budget", rays: [] },
      },
    },
  });
  const reasons = JSON.stringify(h.component.render_partial_reasons());
  assert.ok(reasons.includes("root_access_label"));
  assert.ok(reasons.includes("angles_unresolved"));
  assert.ok(reasons.includes("doubling_label"));
  assert.ok(reasons.includes("calculation_budget"));
});

test("no-paths message waits for calculation completion and a stopped timer", async () => {
  const h = harness();
  h.component.props.minibrot_id = 7;
  h.component.componentDidMount();
  await flush_async();
  h.workers[0].onmessage({
    data: {
      group: {
        id: "root_access",
        result: { status: "angles_unresolved", rays: [] },
      },
    },
  });
  await flush_async();
  let rendered = JSON.stringify(h.component.render());
  assert.ok(rendered.includes("cache_progress_saved"));
  assert.ok(!rendered.includes("cache_no_paths"));
  assert.equal(h.component.state.calculating, true);
  assert.equal(h.stopped_timers.length, 0);
  h.workers[0].onmessage({
    data: { result: { status: "angles_unresolved", rays: [] } },
  });
  rendered = JSON.stringify(h.component.render());
  assert.ok(rendered.includes("cache_no_paths"));
  assert.ok(!rendered.includes("cache_progress_saved"));
  assert.equal(h.component.state.calculating, false);
  assert.ok(h.stopped_timers.includes(1));
});
