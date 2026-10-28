import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";

function harness() {
  const starts = [], polls = [], timers = [];
  class Component { setState(update) { this.state = { ...this.state, ...update }; } }
  const source = readFileSync(new URL("../src/pages/study/minibrots/MinibrotTerrainCache.jsx", import.meta.url), "utf8")
    .replace(/^import[\s\S]*?;\r?\n/gm, "").replace("export default class", "class");
  const sandbox = {
    React: { createElement: (type, props, ...children) => ({ type, props, children }) }, Component,
    styled: { div: () => "cache-test" }, PropTypes: { number: { isRequired: () => null } },
    AppText: { get: key => key }, TERRAIN_CACHE_TEXT: { run: "run", running: "running", completed: "completed" },
    TilesBackend: {
      start_terrain_cache: id => new Promise((resolve, reject) => starts.push({ id, resolve, reject })),
      terrain_cache_job: id => new Promise((resolve, reject) => polls.push({ id, resolve, reject })),
    },
    setTimeout: callback => { timers.push(callback); return timers.length; }, clearTimeout: () => {},
  };
  vm.runInNewContext(transformSync(`${source}\nglobalThis.Test = MinibrotTerrainCache;`, { loader: "jsx" }).code, sandbox);
  const component = new sandbox.Test(); component.props = { bailiwick_id: 55 };
  return { component, starts, polls, timers };
}
const job = { id: "job-1", bailiwick_id: 55, status: "running", level: 10,
  native_resolution: { x: 1597, y: 1597 }, total: 64, processed: 0 };

test("button uses selected ID, prevents duplicate starts, and polls cache result", async () => {
  const { component, starts, polls, timers } = harness();
  const starting = component.start();
  await component.start();
  assert.equal(starts.length, 1);
  assert.equal(starts[0].id, 55);
  starts[0].resolve({ job }); await starting;
  assert.equal(component.state.status, "running");
  assert.equal(component.render().children[0].props.disabled, true);
  const polling = timers[0]();
  assert.equal(polls[0].id, "job-1");
  polls[0].resolve({ job: { ...job, status: "completed", processed: 64,
    result: { created: 64, reused: 0, missing: 0, failed: 0, compressed_bytes: 1024, manifest: "manifest.json" } } });
  await polling;
  assert.equal(component.state.status, "completed");
  assert.equal(component.render().children[0].props.disabled, false);
});

test("changing selection/unmount prevents a late cache job from updating the old panel", async () => {
  const { component, starts } = harness();
  const starting = component.start();
  component.componentWillUnmount();
  starts[0].resolve({ job }); await starting;
  assert.equal(component.state.job, null);
});

test("start failure restores an actionable button", async () => {
  const { component, starts } = harness();
  const starting = component.start();
  starts[0].reject(new Error("offline")); await starting;
  assert.equal(component.state.status, "failed");
  assert.equal(component.render().children[0].props.disabled, false);
});
