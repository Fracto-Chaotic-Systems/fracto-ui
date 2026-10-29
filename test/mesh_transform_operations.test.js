import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { setImmediate } from "node:timers";
import { transformSync } from "esbuild";

const selection = { id: 1, count: 5, level: 3, region: { focal_point: { x: -1.5, y: 1.5 }, scope: 1, aspect_ratio: 1 } };
const job = (changes = {}) => ({ id: "job", status: "running", total: 5, processed: 1, created: 1, reused: 0, failed: 0, ...changes });
const tick = () => new Promise(setImmediate);
function harness() {
  const starts = [], polls = [], stops = [], busy = [], changed = [], timers = new Map(); let next_timer = 0;
  class Component { setState(update, callback) { this.state = { ...this.state, ...update }; callback?.(); } }
  const read = file => readFileSync(new URL(`../src/pages/tiles/${file}.jsx`, import.meta.url), "utf8").replace(/^import[\s\S]*?;\r?\n/gm, "");
  const sandbox = { Component, React: { createElement: (type, props, ...children) => ({ type, props, children }) },
    PropTypes: Object.fromEntries(["object", "string", "func", "bool", "number"].map(key => [key, { isRequired: true }])),
    PAGE_MODE_OPERATOR: "operator", AbortController, MeshTransformOperationsView: "view",
    TilesBackend: Object.fromEntries([["start_mesh_transform", starts], ["terrain_cache_job", polls], ["stop_mesh_transform", stops]]
      .map(([name, list]) => [name, (data, options) => new Promise((resolve, reject) => list.push({ data, options, resolve, reject }))])),
    setTimeout: (fn, ms) => { const id = ++next_timer; timers.set(id, { fn, ms }); return id; }, clearTimeout: id => timers.delete(id),
  };
  vm.runInNewContext(transformSync(read("MeshTransformOperations").replace("export default class", "class") + "\nglobalThis.Test = MeshTransformOperations;", { loader: "jsx" }).code, sandbox);
  const component = new sandbox.Test();
  component.props = { selection, automation_mode: "operator", on_busy_change: value => busy.push(value), on_change: () => changed.push(true), on_close() {} };
  component.componentDidMount();
  return { component, starts, polls, stops, busy, changed, timers, read };
}

test("start is explicit and sends only the captured count, level and region", async () => {
  const h = harness(); assert.equal(h.starts.length, 0);
  const starting = h.component.start();
  assert.equal(h.starts[0].data.count, 5); assert.equal(h.starts[0].data.level, 3);
  assert.equal(h.starts[0].data.region, selection.region);
  assert.equal(h.starts[0].data.id, undefined);
  h.starts[0].resolve({ job: job() }); await starting;
  assert.equal(h.component.state.job.status, "running"); assert.equal(h.busy.at(-1), true);
  h.component.componentWillUnmount();
});

test("stop rejects a late progress response and resume sends only the remaining count", async () => {
  const h = harness(), first = h.component.start(); h.starts[0].resolve({ job: job() }); await first;
  const polling = h.component.poll();
  const stopping = h.component.stop();
  h.stops[0].resolve({ job: job({ status: "cancelled", created: 2, processed: 2 }) }); await stopping;
  h.polls[0].resolve({ job: job({ created: 1 }) }); await polling;
  assert.equal(h.component.state.job.status, "cancelled");
  const resume = h.component.start(); assert.equal(h.starts[1].data.count, 3);
  h.starts[1].resolve({ job: job({ status: "completed", created: 3, processed: 3, total: 3 }) }); await resume;
  assert.equal(h.component.state.saved_before, 2); assert.equal(h.component.state.job.created, 3);
  assert.equal(h.busy.at(-1), false); assert.ok(h.changed.length >= 2);
  h.component.componentWillUnmount();
});

test("operator mode is required and leaving it stops a running manual job", async () => {
  const h = harness(), start = h.component.start(); h.starts[0].resolve({ job: job() }); await start;
  const previous = h.component.props;
  h.component.props = { ...previous, automation_mode: "manager" }; h.component.componentDidUpdate(previous);
  assert.equal(h.stops.length, 1);
  h.stops[0].resolve({ job: job({ status: "cancelled" }) }); await tick();
  await h.component.start(); assert.equal(h.starts.length, 1);
  h.component.componentWillUnmount();
});

test("stale selections and lost jobs refresh counts, and unmount aborts requests", async () => {
  const h = harness(), start = h.component.start(); h.starts[0].reject(new Error("HTTP 409")); await start;
  assert.equal(h.component.state.error_key, "changed"); assert.equal(h.busy.at(-1), false);
  const retry = h.component.start(); h.starts[1].resolve({ job: job() }); await retry;
  const lost = h.component.poll(); h.polls[0].reject(new Error("HTTP 404")); await lost;
  assert.equal(h.component.state.error_key, "lost"); assert.equal(h.busy.at(-1), false);
  const pending = h.component.start(); h.component.componentWillUnmount();
  assert.equal(h.starts[2].options.signal.aborted, true);
  const before = h.component.state; h.starts[2].resolve({ job: job() }); await pending;
  assert.equal(h.component.state, before); assert.equal(h.timers.size, 0);
});

test("the operation heading contains exactly the clicked numeral and level", () => {
  const h = harness();
  const source = h.read("MeshTransformOperationsView").replace("export default function", "function");
  const sandbox = { React: { lazy: () => "preview", Suspense: "suspense", createElement: (type, props, ...children) => ({ type, props, children }) },
    styled: { section: () => "section" }, CoolButton: "button", MeshTilePreview: "preview", PropTypes: Object.fromEntries(["object", "bool", "number", "string", "func"].map(key => [key, { isRequired: true }])),
    TEXT: new Proxy({}, { get: (_target, name) => name }), AppText: { get: key => key === "title" ? "transforming {count} tiles of level {level}" : key } };
  vm.runInNewContext(transformSync(source + "\nglobalThis.View = MeshTransformOperationsView;", { loader: "jsx" }).code, sandbox);
  const rendered = sandbox.View({ selection: { ...selection, count: 74485, level: 10 }, starting: false, stopping: false, saved_before: 0, operator: true });
  assert.equal(rendered.children[0].children[0], "transforming 74485 tiles of level 10");
});
