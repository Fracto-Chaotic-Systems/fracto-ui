import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createHash, webcrypto } from "node:crypto";
import { setImmediate } from "node:timers";
import { transformSync } from "esbuild";
import * as THREE from "three";
import SimulatorMeshScene from "../src/pages/assets/SimulatorMeshScene.js";
import { build_terrain_tile } from "../../../sdk/terrain/Mesh.js";
import { encode_terrain_mesh } from "../../../sdk/terrain/Cache.js";
import { decode_terrain_gzip } from "../../../sdk/terrain/Decode.js";
import {
  terrain_palette,
  terrain_palette_mapper,
} from "../../../sdk/terrain/Palette.js";
import {
  resolve_lod_plan,
  request_lod_plan,
} from "../../../sdk/terrain/Lod.js";
import FractoCanvasBuffer from "../../../sdk/FractoCanvasBuffer.js";
import { minimum_terrain_resolution } from "../src/pages/assets/SimulatorTerrainData.js";
import { flight_readings } from "../src/pages/assets/SimulatorFlightMetrics.js";
import {
  flight_region_key,
  prepare_flight_pose,
  confine_flight,
  flight_boundary_status,
} from "../src/pages/assets/SimulatorFlightRegion.js";
import {
  scale_escape_relief,
  ESCAPE_RELIEF_MULTIPLIER,
} from "../src/pages/assets/SimulatorEscapeRelief.js";
import {
  TerrainLighting,
  normalize_terrain_lighting,
} from "../src/pages/assets/SimulatorTerrainLighting.js";

const read = (name) =>
  readFileSync(
    new URL(`../src/pages/assets/${name}`, import.meta.url),
    "utf8",
  ).replace(/^import[\s\S]*?;\r?\n/gm, "");
const bounds = { left: -2, right: -1, top: 2, bottom: 1 };
const tile = {
  short_code: "00",
  bounds,
  sha256: "a".repeat(64),
  instances: [
    { mirror_y: false, bounds },
    { mirror_y: true, bounds: { left: -2, right: -1, top: -1, bottom: -2 } },
  ],
};
const plan = {
  namespace: "a".repeat(32),
  level: 2,
  region: {
    focal_point: { x: -1.5, y: 0 },
    scope: 1,
    aspect_ratio: 4,
    bounds: { left: -2, right: -1, top: 2, bottom: -2 },
  },
  tiles: [tile],
};

test("runtime scene reuses cached geometry, mirrors placement, clips the navigator and disposes resources", () => {
  const scene = new THREE.Scene(),
    renderer = {},
    lighting = { attach() {} };
  const runtime = new SimulatorMeshScene(scene, renderer, lighting);
  const item = {
    key: "mesh",
    short_code: "00",
    positions: new Float32Array([0, 0, 0, 1, 1, 1, 0, 0, 1]),
    uvs: new Float32Array(6),
    indices: new Uint32Array([0, 1, 2]),
    pixels: new Uint8Array(256 * 256 * 4),
  };
  runtime.install({ plan, items: [item] }, false);
  assert.equal(runtime.group.children.length, 2);
  const [upper, lower] = runtime.group.children;
  assert.equal(upper.geometry, lower.geometry);
  assert.equal(upper.position.z, -2);
  assert.equal(lower.position.z, 2);
  assert.equal(upper.scale.z, 1);
  assert.equal(lower.scale.z, -1);
  assert.equal(upper.scale.y, 1 / 25);
  assert.equal(renderer.clippingPlanes.length, 4);
  assert.ok(
    renderer.clippingPlanes.every(
      (plane) => plane.distanceToPoint(new THREE.Vector3(0, 0, 0)) >= 0,
    ),
  );
  let disposed = 0;
  upper.geometry.addEventListener("dispose", () => disposed++);
  runtime.install(
    {
      plan,
      items: [
        {
          key: "mesh",
          short_code: "00",
          pixels: new Uint8Array(256 * 256 * 4),
        },
      ],
    },
    true,
  );
  assert.equal(runtime.group.children[0].geometry, upper.geometry);
  assert.equal(disposed, 0);
  assert.equal(runtime.group.children[0].material.wireframe, true);
  runtime.dispose();
  assert.equal(disposed, 1);
  assert.equal(runtime.cache.size, 0);
  assert.equal(scene.children.length, 0);
});

test("persistent runtime worker reuses decoded files and skips geometry transfers already on the GPU", async () => {
  const mesh = build_terrain_tile(
    Array.from({ length: 256 }, () =>
      Array.from({ length: 256 }, () => [0, 100]),
    ),
  );
  const { compressed } = encode_terrain_mesh(mesh, {
    namespace: plan.namespace,
    short_code: "00",
    bounds,
  });
  const sha256 = createHash("sha256").update(compressed).digest("hex");
  const manifest = { ...plan, tiles: [{ ...tile, sha256 }] };
  const messages = [];
  const assets = new Map([["mesh", compressed]]);
  let reads = 0;
  class OffscreenCanvas {
    getContext() {
      return {
        fillRect() {},
        getImageData() {
          return { data: new Uint8ClampedArray(256 * 256 * 4) };
        },
      };
    }
  }
  const self = { postMessage: (message) => messages.push(message) };
  vm.runInNewContext(
    read("SimulatorMeshTextures.js").replace("export default class", "class") +
      "\n" +
      read("SimulatorMesh.worker.js"),
    {
      self,
      decode_terrain_gzip,
      scale_escape_relief,
      terrain_palette,
      terrain_palette_mapper,
      resolve_lod_plan,
      FractoCanvasBuffer,
      AbortController,
      AbortSignal,
      crypto: webcrypto,
      Uint8Array,
      OffscreenCanvas,
      fetch: async (url) => {
        reads++;
        return new Response(assets.get(url) || compressed);
      },
    },
  );
  const run = async (id, geometry_keys, overrides = {}) => {
    await self.onmessage({
      data: {
        id,
        plan: manifest,
        urls: { "00": "mesh" },
        geometry_keys,
        ...overrides,
      },
    });
    return messages.find((message) => message.id === id && message.result)
      ?.result;
  };
  const first = await run(1, []);
  assert.equal(reads, 1);
  assert.equal(first.items.length, 1);
  assert.ok(first.items[0].positions);
  const second = await run(2, [first.items[0].key]);
  assert.equal(reads, 1);
  assert.equal(second.cache_hits, 1);
  assert.equal(second.items[0].positions, undefined);
  assert.equal(second.items[0].pixels.length, 256 * 256 * 4);
  const unchanged = await run(3, [first.items[0].key], {
    current_palette_key: second.palette_key,
  });
  assert.equal(unchanged.items[0].pixels, undefined);
  assert.equal(unchanged.cache_hits, 1);
  assert.equal(reads, 1);
  const corrupt = await run(4, [], {
    plan: { ...manifest, tiles: [{ ...tile, sha256: "b".repeat(64) }] },
  });
  assert.equal(corrupt.items.length, 0);
  assert.equal(corrupt.failures[0], "00");
  const scaled = await run(40, [first.items[0].key], {
    escape_scale: 10,
    current_palette_key: first.palette_key,
  });
  assert.notEqual(scaled.items[0].key, first.items[0].key);
  assert.ok(
    scaled.items[0].positions,
    "changed multiplier uploads new geometry",
  );
  assert.equal(scaled.escape_scale, 10);
  const reused = await run(41, [scaled.items[0].key], {
    escape_scale: 10,
    current_palette_key: scaled.palette_key,
  });
  assert.equal(reused.items[0].positions, undefined);
  const restored = await run(42, [scaled.items[0].key], { escape_scale: 1 });
  assert.equal(restored.items[0].key, first.items[0].key);
  assert.deepEqual(restored.items[0].positions, first.items[0].positions);
  const children = [];
  for (let digit = 0; digit < 4; digit++) {
    const code = `00${digit}`,
      left = -2 + (digit % 2) * 0.5,
      top = 2 - Math.floor(digit / 2) * 0.5;
    const child_bounds = { left, right: left + 0.5, top, bottom: top - 0.5 };
    const child = encode_terrain_mesh(mesh, {
      namespace: plan.namespace,
      short_code: code,
      bounds: child_bounds,
    }).compressed;
    assets.set(code, child);
    children.push({
      short_code: code,
      bounds: child_bounds,
      sha256: createHash("sha256").update(child).digest("hex"),
      instances: [{ mirror_y: false, bounds: child_bounds }],
    });
  }
  const local = request_lod_plan(
    {
      ...manifest,
      refinements: [
        { id: "00/0", parent_short_code: "00", mirror_y: false, children },
      ],
    },
    ["00/0"],
  );
  const urls = {
    "00": "mesh",
    ...Object.fromEntries(
      children.map((child) => [child.short_code, child.short_code]),
    ),
  };
  const good = assets.get("003");
  assets.set("003", compressed);
  const fallback = await run(5, [], { plan: local, urls });
  assert.equal(fallback.items.length, 1);
  assert.equal(fallback.plan.tiles[0].instances.length, 2);
  assert.equal(fallback.failures.length, 0);
  assert.equal(fallback.detail_failures[0], "003");
  assets.set("003", good);
  const refined = await run(6, [], { plan: local, urls });
  assert.equal(refined.plan.refined_groups[0], "00/0");
  assert.equal(refined.items.length, 5);
  assert.equal(
    refined.plan.tiles.find((tile) => tile.short_code === "00").instances
      .length,
    1,
  );
});

test("runtime loader cancels obsolete navigation and retains one worker until unmount", async () => {
  const requests = [],
    workers = [];
  const create_worker = () => {
    const worker = {
      sent: [],
      postMessage(value) {
        this.sent.push(value);
      },
      terminate() {
        this.terminated = true;
      },
    };
    workers.push(worker);
    return worker;
  };
  const sandbox = {
    TilesBackend: {},
    Worker: undefined,
    URL,
    AbortController,
    performance,
    setTimeout,
    clearTimeout,
  };
  const source = read("SimulatorMeshLoader.js")
    .replace("export default class", "class")
    .replaceAll("import.meta.url", JSON.stringify(import.meta.url));
  vm.runInNewContext(
    transformSync(source + "\nglobalThis.Loader=SimulatorMeshLoader", {
      loader: "js",
    }).code,
    sandbox,
  );
  const loader = new sandbox.Loader({
    create_worker,
    fetch_plan: (_params, options) =>
      new Promise((resolve) => requests.push({ resolve, options })),
    mesh_url: (code) => `mesh/${code}`,
  });
  const obsolete = loader.load({}, [], () => {}).catch((error) => error);
  const current = loader.load({}, [], () => {});
  assert.equal(requests[0].options.signal.aborted, true);
  requests[0].resolve(plan);
  requests[1].resolve(plan);
  await new Promise(setImmediate);
  assert.equal((await obsolete).name, "AbortError");
  assert.equal(workers.length, 1);
  const message = workers[0].sent.at(-1);
  workers[0].onmessage({
    data: {
      id: message.id,
      result: { plan, items: [], failures: [], cache_hits: 0 },
    },
  });
  await current;
  const warm = loader.load({}, ["cached"], () => {});
  requests[2].resolve(plan);
  await new Promise(setImmediate);
  assert.equal(workers.length, 1);
  assert.equal(workers[0].sent.at(-1).geometry_keys[0], "cached");
  const rejected = warm.catch((error) => error);
  loader.dispose();
  assert.equal((await rejected).name, "AbortError");
  assert.equal(workers[0].terminated, true);
});

function controller_harness() {
  const requests = [],
    installs = [],
    views = [],
    settings = [],
    wireframes = [];
  class Component {
    setState(update, callback) {
      this.state = {
        ...this.state,
        ...(typeof update === "function" ? update(this.state) : update),
      };
      callback?.();
    }
  }
  class Loader {
    load(params, keys, on_progress, palette_key, options) {
      return new Promise((resolve, reject) =>
        requests.push({
          params,
          keys,
          on_progress,
          palette_key,
          options,
          resolve,
          reject,
        }),
      );
    }
    cancel() {}
    dispose() {
      this.disposed = true;
    }
  }
  const sandbox = {
    React: { createRef: () => ({ current: null }) },
    Component,
    THREE,
    SimulatorMeshLoader: Loader,
    PropTypes: { number: { isRequired: true }, object: {} },
    TerrainLighting,
    normalize_terrain_lighting,
    minimum_terrain_resolution,
    ESCAPE_RELIEF_MULTIPLIER,
    flight_readings,
    flight_region_key,
    prepare_flight_pose,
    confine_flight,
    flight_boundary_status,
    create_navigation_controls: (_camera, _canvas, mode, previous) => {
      previous?.dispose();
      return {
        target: mode === "inspect" ? new THREE.Vector3() : undefined,
        inspection_distance: previous?.inspection_distance || 1,
        enabled: mode === "inspect",
        paused: mode === "fly",
        set_paused(value) {
          this.paused = value;
          if (value) this.speed = 0;
        },
        addEventListener() {},
        update() {},
        dispose() {
          this.disposed = true;
        },
      };
    },
    KEY_ASSETS_SIMULATOR_BASE_RESOLUTION: "resolution",
    KEY_ASSETS_SIMULATOR_LIGHTING: "lighting",
    AppSettings: {
      get: (key) => (key === "resolution" ? 1000 : undefined),
      unsubscribe() {},
      on_settings_changed: (value) => settings.push(value),
    },
    setTimeout,
    clearTimeout,
    console: { error() {} },
  };
  vm.runInNewContext(
    transformSync(
      read("SimulatorTerrain.jsx").replace("export default class", "class") +
        "\nglobalThis.Controller=SimulatorTerrain",
      { loader: "jsx" },
    ).code,
    sandbox,
  );
  const controller = new sandbox.Controller();
  controller.props = {
    focal_point: { x: -1.5, y: 0 },
    scope: 1,
    aspect_ratio: 4,
  };
  controller.terrain = {
    keys: () => ["cached"],
    install: (...args) => installs.push(args),
    dispose() {},
    wireframe: (value) => wireframes.push(value),
  };
  const real_set_view = controller.set_view;
  controller.set_view = (view) => views.push(view);
  return {
    controller,
    requests,
    installs,
    views,
    settings,
    wireframes,
    real_set_view,
  };
}
const loaded = {
  plan,
  items: [{ key: "mesh" }],
  failures: [],
  maximum_height: 0.5,
  cache_hits: 1,
  elapsed_ms: 10,
};

test("mode selection defaults to inspect, keeps pose and terrain, and clears flight on blur/presets", () => {
  const { controller: c, requests, real_set_view } = controller_harness();
  c.camera = new THREE.PerspectiveCamera();
  c.camera.position.set(0.3, -0.2, 0.6);
  c.camera.quaternion.setFromEuler(new THREE.Euler(1, 2, 3));
  c.renderer = { domElement: { focus() {} } };
  c.draw = () => {};
  c.flight_ready = true;
  c.flight_region = plan.region;
  assert.equal(c.state.navigation_mode, "inspect");
  c.replace_controls("inspect");
  const previous = c.controls,
    pose = c.camera.quaternion.clone(),
    position = c.camera.position.clone();
  c.change_navigation_mode({ target: { value: "fly" } });
  assert.equal(previous.disposed, true);
  assert.equal(c.state.navigation_mode, "fly");
  assert.equal(c.controls.enabled, false);
  c.focus_canvas();
  assert.equal(c.controls.enabled, true);
  const flying = c.controls;
  c.stop_flight();
  assert.equal(flying.disposed, true);
  assert.equal(c.controls.enabled, false);
  c.extent = 1;
  c.target_height = 0.02;
  real_set_view("top");
  assert.equal(c.controls.enabled, false);
  assert.ok(c.controls.inspection_distance > 0);
  c.camera.position.copy(position);
  c.camera.quaternion.copy(pose);
  c.change_navigation_mode({ target: { value: "inspect" } });
  assert.equal(c.state.navigation_mode, "inspect");
  assert.deepEqual(c.camera.position, position);
  assert.ok(c.camera.quaternion.equals(pose));
  assert.equal(requests.length, 0, "switching modes never reloads terrain");
});

test("optional instruments use installed terrain scope and skip surface work when hidden", () => {
  const { controller: c } = controller_harness();
  c.camera = new THREE.PerspectiveCamera();
  c.camera.position.set(0.1, 0.02, 0.2);
  c.controls = { speed: 0.1 };
  c.terrain.region = { scope: 2 };
  let queries = 0;
  c.terrain.height_at = (x, z) => {
    queries++;
    assert.equal(x, 0.1);
    assert.equal(z, 0.2);
    return 0.03;
  };
  c.update_flight_readings();
  assert.equal(queries, 0);
  c.toggle_flight_instruments({ target: { checked: true } });
  assert.equal(queries, 1);
  assert.equal(c.state.flight_readings.speed_units, 0.2);
  assert.equal(c.state.flight_readings.altitude, 0.04);
  assert.ok(Math.abs(c.state.flight_readings.clearance + 0.02) < 1e-12);
  c.toggle_flight_instruments({ target: { checked: false } });
  assert.equal(queries, 1);
});

test("detail prediction receives actual flight speed only while flight input is active", () => {
  const { controller: c } = controller_harness();
  c.controls = { enabled: true, paused: false, speed: 0.12 };
  c.control_mode = "inspect";
  assert.equal(c.flight_motion(), null);
  c.control_mode = "fly";
  assert.equal(c.flight_motion().speed, 0.12);
  c.controls.paused = true;
  assert.equal(c.flight_motion(), null);
  c.controls.paused = false;
  c.controls.enabled = false;
  assert.equal(c.flight_motion(), null);
});

test("flight starts inside the navigator, pauses at the boundary and returns without reloading", () => {
  const { controller: c, requests } = controller_harness();
  c.camera = new THREE.PerspectiveCamera();
  c.camera.position.set(2, 2, 2);
  c.renderer = { domElement: { focus() {} } };
  c.draw = () => {};
  c.flight_region = { ...plan.region, aspect_ratio: 1 };
  c.change_navigation_mode({ target: { value: "fly" } });
  c.focus_canvas();
  assert.equal(
    c.controls.enabled,
    false,
    "wait for loaded terrain before starting flight",
  );
  assert.equal(c.state.flight_start_ready, false);
  c.flight_ready = true;
  c.prepare_flight_start();
  assert.ok(
    Math.abs(c.camera.position.x) < 0.5 && Math.abs(c.camera.position.z) < 0.5,
  );
  assert.equal(c.state.flight_start_ready, true);
  const start = c.camera.position.clone(),
    orientation = c.camera.quaternion.clone();
  c.focus_canvas();
  c.controls.speed = 0.2;
  c.camera.position.x = 0.46;
  c.on_camera_changed();
  assert.equal(c.state.flight_boundary, "near");
  c.camera.position.x = 0.6;
  c.on_camera_changed();
  assert.ok(c.camera.position.x < 0.5);
  assert.equal(c.controls.paused, true);
  assert.equal(c.state.flight_boundary, "edge");
  c.return_to_start();
  assert.ok(c.camera.position.equals(start));
  assert.ok(c.camera.quaternion.equals(orientation));
  assert.equal(c.controls.paused, true);
  assert.equal(c.state.flight_boundary, null);
  assert.equal(requests.length, 0);
  c.camera.position.x = 0.1;
  c.flight_region = { ...c.flight_region, scope: 2 };
  c.return_to_start();
  assert.equal(
    c.camera.position.x,
    0.1,
    "never return to an old region's start",
  );
});

test("new navigator regions reset the start, while resolution reloads preserve the flight pose", async () => {
  const { controller: c, requests } = controller_harness();
  c.camera = new THREE.PerspectiveCamera();
  c.renderer = { domElement: { focus() {} } };
  c.draw = () => {};
  c.replace_controls("fly");
  const first = c.load(0);
  requests[0].resolve(loaded);
  await first;
  const start = c.flight_start;
  c.camera.position.x = 0.15;
  const reload = c.load(0);
  requests[1].resolve(loaded);
  await reload;
  assert.equal(c.flight_start, start);
  assert.equal(c.camera.position.x, 0.15);
  c.controls.paused = false;
  const changed = c.load(0);
  requests[2].resolve({
    ...loaded,
    plan: { ...plan, region: { ...plan.region, scope: 2 } },
  });
  await changed;
  assert.notEqual(c.flight_start, start);
  assert.equal(c.camera.position.x, 0);
  assert.equal(c.controls.paused, true);
  assert.equal(c.flight_region.scope, 2);
});

test("detail requests keep displayed terrain while loading and install coarse fallback atomically", async () => {
  const { controller: c, requests, installs } = controller_harness();
  c.state.loaded_info = loaded;
  c.terrain.texture_keys = () => ({ cached: "palette" });
  c.terrain.palette_key = "palette";
  const pending = c.load_detail(plan);
  assert.equal(c.state.detail_loading, true);
  assert.equal(
    installs.length,
    0,
    "existing meshes stay displayed during the request",
  );
  assert.equal(c.state.loaded_info, loaded);
  assert.equal(requests[0].options.plan, plan);
  assert.equal(requests[0].options.escape_scale, 100);
  const fallback = {
    ...loaded,
    detail_failures: ["001"],
    plan: { ...plan, refined_groups: [] },
  };
  requests[0].resolve(fallback);
  await pending;
  assert.equal(installs.length, 1);
  assert.equal(installs[0][0], fallback);
  assert.equal(c.state.detail_loading, false);
  const failed = c.load_detail(plan);
  requests[1].reject(new Error("unavailable"));
  await failed;
  assert.equal(
    installs.length,
    1,
    "failed detail never clears the current scene",
  );
  assert.equal(c.state.loaded_info, fallback);
});

test("active terrain can exceed the 64-entry reuse cache without losing visible meshes", () => {
  const runtime = new SimulatorMeshScene(
    new THREE.Scene(),
    {},
    { attach() {} },
  );
  const tiles = Array.from({ length: 65 }, (_, index) => ({
    ...tile,
    short_code: index.toString(4).padStart(4, "0"),
  }));
  const items = tiles.map((entry, index) => ({
    key: String(index),
    short_code: entry.short_code,
    positions: new Float32Array([0, 0, 0, 1, 0, 1, 0, 0, 1]),
    uvs: new Float32Array(6),
    indices: new Uint32Array([0, 1, 2]),
    pixels: new Uint8Array(256 * 256 * 4),
  }));
  runtime.install({ plan: { ...plan, tiles }, items }, false);
  assert.equal(runtime.cache.size, 65);
  assert.equal(runtime.group.children.length, 130);
  const last = runtime.cache.get("64").geometry;
  runtime.install(
    {
      plan: { ...plan, tiles },
      items: [{ key: "64", short_code: tiles[64].short_code }],
    },
    false,
  );
  assert.equal(runtime.cache.size, 64);
  assert.equal(runtime.group.children[0].geometry, last);
  runtime.dispose();
});

test("simulator requests a minimum and aspect, preserves the view on reload, and keeps lighting/wireframe local", async () => {
  const h = controller_harness();
  const first = h.controller.load(0);
  assert.equal(h.requests[0].params.minimum_resolution, 1000);
  assert.equal(h.requests[0].params.aspect_ratio, 4);
  assert.equal(h.requests[0].keys[0], "cached");
  h.requests[0].resolve(loaded);
  await first;
  assert.deepEqual(h.views, ["oblique"]);
  const second = h.controller.load(0);
  h.requests[1].resolve(loaded);
  await second;
  assert.equal(h.views.length, 1);
  h.controller.toggle_wireframe();
  assert.equal(h.wireframes.at(-1), true);
  h.controller.on_lighting_changed("lighting", { enabled: true });
  assert.equal(h.requests.length, 2);
  assert.equal(h.controller.lighting.uniforms.terrainLightEnabled.value, 1);
  h.controller.change_resolution({ target: { value: "1234" } });
  h.controller.apply_resolution({ preventDefault() {} });
  assert.equal(h.settings.at(-1).resolution, 1234);
  h.controller.componentWillUnmount();
  assert.equal(h.controller.loader.disposed, true);
});

test("simulator ignores superseded geometry and progress, clears empty regions and reports request failures", async () => {
  const h = controller_harness();
  h.controller.sequence = 1;
  const first = h.controller.load(1);
  h.controller.sequence = 2;
  const second = h.controller.load(2);
  h.requests[1].resolve(loaded);
  await second;
  h.requests[0].resolve(loaded);
  await first;
  assert.equal(h.installs.length, 1);
  h.requests[0].on_progress({ stage: "loading", value: 40 });
  assert.equal(h.controller.state.progress, null);
  const empty = h.controller.load(2);
  h.requests[2].resolve({ ...loaded, items: [], plan: { ...plan, tiles: [] } });
  await empty;
  assert.equal(h.controller.state.status, "empty");
  assert.equal(h.installs.at(-1)[0].items.length, 0);
  const failed = h.controller.load(2);
  h.requests[3].reject(new Error("offline"));
  await failed;
  assert.equal(h.controller.state.status, "failed");
  assert.equal(h.controller.state.progress, null);
  h.controller.componentWillUnmount();
});
