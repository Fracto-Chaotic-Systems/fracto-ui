import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { setImmediate } from "node:timers";
import { transformSync } from "esbuild";

function harness() {
  const maps = [],
    inventories = [],
    draws = [],
    timers = new Map();
  let timer_id = 0;
  class Component {
    setState(update, callback) {
      this.state = { ...this.state, ...update };
      callback?.();
    }
  }
  const source = readFileSync(
    new URL("../src/pages/tiles/MeshHeatMap.jsx", import.meta.url),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace("export default class", "class")
    .replace("export function mesh_map_params", "function mesh_map_params");
  const pending = (list, params, options) =>
    new Promise((resolve, reject) =>
      list.push({ params, options, resolve, reject }),
    );
  const sandbox = {
    Component,
    MeshHeatMapView: "view",
    React: {
      createElement: (type, props, ...children) => ({ type, props, children }),
    },
    createRef: () => ({ current: null }),
    PropTypes: { object: { isRequired: true }, number: { isRequired: true } },
    styled: { div: () => "panel" },
    AbortController,
    AppText: { get: (key) => key },
    MESH_MAP_TEXT: Object.fromEntries(
      [
        "title",
        "loading",
        "waiting",
        "empty",
        "error",
        "retry",
        "all",
        "level",
        "meshes",
        "coverage",
      ].map((key) => [key, key]),
    ),
    TilesBackend: {
      mesh_heat_map: (params, options) => pending(maps, params, options),
      mesh_inventory: (options) => pending(inventories, null, options),
    },
    FractoCanvasBuffer: { buffer_to_canvas: (...args) => draws.push(args) },
    FractoColors: { get_heat_map_greys_map: () => ({ _2: 200, _3: 100 }) },
    setTimeout: (fn, ms) => {
      const id = ++timer_id;
      timers.set(id, { fn, ms });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  };
  vm.runInNewContext(
    transformSync(
      `${source}\nglobalThis.Test = MeshHeatMap; globalThis.params = mesh_map_params;`,
      { loader: "jsx" },
    ).code,
    sandbox,
  );
  const component = new sandbox.Test();
  component.props = {
    width_px: 500,
    frame_settings: {
      width_px: 400,
      focal_point: { x: -1.5, y: 1.5 },
      scope: 1,
      aspect_ratio: 1,
    },
  };
  component.canvas.current = {
    width: 2,
    height: 2,
    getContext: () => ({ fillRect() {} }),
  };
  const poll = () => {
    const timer = timers.get(component.timer);
    timers.delete(component.timer);
    return timer.fn();
  };
  return {
    component,
    maps,
    inventories,
    draws,
    timers,
    poll,
    params: sandbox.params,
  };
}
const tick = () => new Promise(setImmediate);
const result = (revision = 1) => ({
  namespace: "mesh-source",
  inventory_revision: revision,
  width_px: 2,
  height_px: 2,
  heat_map_buffer: [
    [
      [0, 2],
      [0, 3],
    ],
    [
      [0, 0],
      [0, 2],
    ],
  ],
  coverage: [
    { level: 2, mesh_count: 2, pixel_count: 2 },
    { level: 3, mesh_count: 1, pixel_count: 1 },
  ],
});
const mount_ready = async (h) => {
  h.component.componentDidMount();
  h.maps[0].resolve(result());
  await tick();
};

test("mount fetches the selected navigator region and paints ready levels with an empty background", async () => {
  const h = harness();
  await mount_ready(h);
  assert.equal(h.maps[0].params.focal_point_x, -1.5);
  assert.equal(h.maps[0].params.width_px, 400);
  assert.equal(h.maps[0].params.aspect_ratio, 1);
  assert.deepEqual(Array.from(h.draws.at(-1)[4]), [2, 3]); // level 0 remains unselected/neutral
  assert.equal(h.component.state.loading, false);
  h.component.select_level(2);
  assert.deepEqual(Array.from(h.draws.at(-1)[4]), [3]);
  h.component.componentWillUnmount();
});

test("rapid navigation aborts the old request and ignores its late response", async () => {
  const h = harness();
  h.component.componentDidMount();
  const old = h.component.props;
  h.component.props = {
    ...old,
    frame_settings: { ...old.frame_settings, scope: 0.5 },
  };
  h.component.componentDidUpdate(old);
  assert.equal(h.maps[0].options.signal.aborted, true);
  h.maps[1].resolve(result(2));
  await tick();
  h.maps[0].resolve(result(1));
  await tick();
  assert.equal(h.component.state.result.inventory_revision, 2);
  const previous = h.component.props;
  h.component.props = {
    ...previous,
    frame_settings: {
      ...previous.frame_settings,
      render_complete: { time: 123 },
    },
  };
  h.component.componentDidUpdate(previous);
  assert.equal(h.maps.length, 2); // render metadata and mode changes do not refetch
  h.component.componentWillUnmount();
});

test("polling refreshes a stationary view only when inventory changes and preserves level selection", async () => {
  const h = harness();
  await mount_ready(h);
  h.component.select_level(2);
  const same = h.poll();
  h.inventories[0].resolve({ namespace: "mesh-source", revision: 1 });
  await same;
  assert.equal(h.maps.length, 1);
  const changed = h.poll();
  h.inventories[1].resolve({ namespace: "mesh-source", revision: 2 });
  await tick();
  assert.equal(h.maps.length, 2);
  h.maps[1].resolve(result(2));
  await changed;
  assert.deepEqual(Array.from(h.component.state.selected_levels), [3]);
  const replaced = h.poll();
  h.inventories[2].resolve({ namespace: "another-source", revision: 2 });
  await tick();
  assert.equal(h.maps.length, 3);
  h.maps[2].resolve({ ...result(2), namespace: "another-source" });
  await replaced;
  h.component.componentWillUnmount();
});

test("failed/timeout requests are retryable and unmount cancels polling and both requests", async () => {
  const h = harness();
  h.component.componentDidMount();
  const timeout = [...h.timers.values()].find((timer) => timer.ms === 20000);
  timeout.fn();
  assert.equal(h.maps[0].options.signal.aborted, true);
  h.maps[0].reject(Object.assign(new Error("timeout"), { name: "AbortError" }));
  await tick();
  assert.equal(h.component.state.error, true);
  const retry = h.component.load_map();
  h.maps[1].resolve(result());
  await retry;
  const polling = h.poll();
  h.component.componentWillUnmount();
  assert.equal(h.inventories[0].options.signal.aborted, true);
  const before = h.component.state;
  h.inventories[0].resolve({ namespace: "mesh-source", revision: 99 });
  await polling;
  assert.equal(h.component.state, before);
  assert.equal(h.timers.size, 0);
});

test("a rebuilt inventory refreshes even when source and revision repeat", async () => {
  const h = harness();
  h.component.componentDidMount();
  h.maps[0].resolve({ ...result(1), inventory_epoch: "original-inventory" });
  await tick();
  const polling = h.poll();
  h.inventories[0].resolve({
    namespace: "mesh-source",
    revision: 1,
    inventory_epoch: "rebuilt-inventory",
  });
  await tick();
  assert.equal(h.maps.length, 2);
  h.maps[1].resolve({ ...result(1), inventory_epoch: "rebuilt-inventory" });
  await polling;
  assert.equal(h.component.state.result.inventory_epoch, "rebuilt-inventory");
  h.component.componentWillUnmount();
});

test("transforms freeze coverage through polling, navigation and late responses, then refresh on completion", async () => {
  const h = harness();
  await mount_ready(h);
  const frozen = h.component.state.result;
  const polling = h.poll();
  h.component.on_operation_busy(true);
  assert.equal(h.inventories[0].options.signal.aborted, true);
  h.inventories[0].resolve({ namespace: "mesh-source", revision: 99 });
  await polling;
  await h.poll();
  assert.equal(
    h.inventories.length,
    1,
    "inventory polling pauses during construction",
  );
  const previous = h.component.props;
  h.component.props = {
    ...previous,
    frame_settings: { ...previous.frame_settings, scope: 0.5 },
  };
  h.component.componentDidUpdate(previous);
  await h.component.load_map(true);
  assert.equal(h.maps.length, 1);
  assert.equal(h.component.state.result, frozen);
  assert.equal(h.component.state.loading, false);
  assert.equal(h.component.render().props.params.scope, 1);
  h.component.on_operation_busy(false);
  const refresh = h.component.render().props.on_operation_change();
  assert.equal(h.maps[1].params.scope, 0.5);
  h.maps[1].resolve(result(99));
  await refresh;
  assert.equal(h.component.state.result.inventory_revision, 99);
  h.component.componentWillUnmount();
});

test("starting a transform invalidates a heat-map response already in flight", async () => {
  const h = harness();
  await mount_ready(h);
  const refresh = h.component.load_map(true);
  h.component.on_operation_busy(true);
  assert.equal(h.maps[1].options.signal.aborted, true);
  const draws = h.draws.length;
  h.maps[1].resolve(result(2));
  await refresh;
  assert.equal(h.component.state.result, null);
  assert.equal(h.draws.length, draws);
  assert.equal(h.component.state.loading, false);
  h.component.componentWillUnmount();
});

test("view sizing respects available space, aspect ratio, and endpoint pixel limits", () => {
  const h = harness();
  assert.equal(h.params({ ...h.component.props, width_px: 0 }), null);
  assert.equal(h.params({ ...h.component.props, frame_settings: {} }), null);
  const params = h.params({
    width_px: 5000,
    frame_settings: {
      ...h.component.props.frame_settings,
      width_px: 5000,
      aspect_ratio: 4,
    },
  });
  assert.ok(params.width_px <= 512);
  const rounded = h.params({
    width_px: 5000,
    frame_settings: {
      ...h.component.props.frame_settings,
      width_px: 5000,
      aspect_ratio: 1.04646,
    },
  });
  assert.ok(
    rounded.width_px * Math.round(rounded.width_px * rounded.aspect_ratio) <=
      1048576,
  );
  assert.ok(
    params.width_px * Math.round(params.width_px * params.aspect_ratio) <=
      1048576,
  );
});

test("opening a transform snapshots the clicked region and preserves a running selection during navigation", async () => {
  const h = harness();
  await mount_ready(h);
  h.component.open_transform({ count: 13, level: 3 });
  const selected = h.component.state.operation;
  assert.equal(selected.count, 13);
  assert.equal(selected.level, 3);
  assert.equal(selected.region.focal_point.x, -1.5);
  h.component.setState({ operation_busy: true });
  h.component.open_transform({ count: 20, level: 4 });
  assert.equal(h.component.state.operation, selected);
  const previous = h.component.props;
  h.component.props = {
    ...previous,
    frame_settings: { ...previous.frame_settings, scope: 0.5 },
  };
  h.component.componentDidUpdate(previous);
  assert.equal(h.component.state.operation.region.scope, 1);
  h.component.componentWillUnmount();
});
