import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import * as THREE from "three";
import { terrain_height, terrain_mesh_data, terrain_resolution, TERRAIN_RESOLUTIONS, TERRAIN_PREVIEW_SIZE } from "../src/pages/assets/SimulatorTerrainData.js";
import SimulatorTerrainLoader from "../src/pages/assets/SimulatorTerrainLoader.js";
import { terrain_smoothing, smooth_terrain_positions } from "../src/pages/assets/SimulatorTerrainSmoothing.js";
import { setImmediate } from "node:timers/promises";

test("height mapping is monotonic, bounded at scope / 15 and rejects invalid counts", () => {
  const heights = [0, 1, 10, 1000, 1e6, 1e9].map((iteration) => terrain_height(iteration, 2.5));
  assert.equal(heights[0], 0);
  assert.equal(heights.at(-1), 2.5 / 15);
  assert.ok(heights.every((height, i) => height >= 0 && height <= 2.5 / 15 && (!i || height >= heights[i - 1])));
  for (const invalid of [-1, NaN, Infinity, null]) assert.equal(terrain_height(invalid, 2.5), null);
  for (const invalid of [0, -1, NaN, Infinity, undefined]) assert.throws(() => terrain_height(10, invalid), RangeError);
});

test("all terrain elevations scale proportionally with navigator scope", () => {
  const buffer = [[[0, 10], [1, 1000]], [[2, 1000000], [0, 1e9]]];
  for (const scope of [2.5, 1, 0.01, 1e-8]) {
    const data = terrain_mesh_data(buffer, scope);
    assert.ok(Math.abs(data.max_height - scope / 15) <= scope * 1e-12);
    for (let i = 0; i < data.positions.length / 3; i++) {
      assert.ok(data.positions[i * 3 + 1] <= scope / 15 + scope * 1e-8);
    }
    assert.ok(Math.abs(terrain_height(1000, scope) / scope - terrain_height(1000, 1)) < 1e-12);
  }
});

test("mesh preserves column-major values, real/imaginary orientation and texture centers", () => {
  const data = terrain_mesh_data([[[0, 1], [1, 1000]], [[2, 10], [0, 1e6]]], 2);
  assert.equal(data.positions[0], -1);
  assert.equal(data.positions[2], -1);
  assert.ok(Math.abs(data.positions[1] - terrain_height(1, 2)) < 1e-7);
  assert.ok(Math.abs(data.positions[4] - terrain_height(10, 2)) < 1e-7);
  assert.ok(Math.abs(data.positions[10] - 2 / 15) < 1e-7);
  assert.deepEqual([...data.uvs.slice(0, 2)], [0.25, 0.75]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
  geometry.computeVertexNormals();
  assert.ok(geometry.attributes.normal.getY(0) > 0);
  geometry.dispose();
});

test("missing samples omit triangles instead of creating artificial terrain", () => {
  const data = terrain_mesh_data([[[0, 10], [1, 20]], [[2, 30], null]], 1);
  assert.equal(data.indices.length, 3);
  assert.ok(!data.indices.includes(3));
  assert.throws(() => terrain_mesh_data([[null, null], [null, null]], 1));
  assert.throws(() => terrain_mesh_data([], 1));
  assert.throws(() => terrain_mesh_data([[[0, 1]], []], 1));
});

test("Gaussian smoothing rounds peaks, blends strength and preserves source data and X/Z", () => {
  const width = 7, height = 7;
  const base = new Float32Array(width * height * 3);
  const valid = new Uint8Array(width * height).fill(1);
  const center = 3 * width + 3;
  for (let i = 0; i < valid.length; i++) { base[i * 3] = i; base[i * 3 + 2] = -i; }
  base[center * 3 + 1] = 1 / 15;
  const original = base.slice();
  const zero = smooth_terrain_positions(base, valid, width, height, 0);
  const full = smooth_terrain_positions(base, valid, width, height, 100);
  const half = smooth_terrain_positions(base, valid, width, height, 50);
  assert.deepEqual(zero.positions, base);
  assert.deepEqual(base, original);
  assert.ok(full.positions[center * 3 + 1] < base[center * 3 + 1]);
  assert.ok(full.positions[(center + 1) * 3 + 1] > 0);
  assert.ok(full.max_height <= 1 / 15);
  assert.ok(Math.abs(half.positions[center * 3 + 1] - (base[center * 3 + 1] + full.positions[center * 3 + 1]) / 2) < 1e-8);
  for (let i = 0; i < valid.length; i++) {
    assert.equal(full.positions[i * 3], base[i * 3]);
    assert.equal(full.positions[i * 3 + 2], base[i * 3 + 2]);
  }
  assert.equal(terrain_smoothing(-1), 0);
  assert.equal(terrain_smoothing(101), 100);
  assert.equal(terrain_smoothing(NaN), 100);
});

test("smoothing normalizes mesh edges and holes instead of pulling heights toward zero", () => {
  const base = new Float32Array(5 * 5 * 3);
  const valid = new Uint8Array(25).fill(1);
  for (let i = 0; i < valid.length; i++) base[i * 3 + 1] = 0.05;
  valid[12] = 0;
  base[12 * 3 + 1] = 0;
  const result = smooth_terrain_positions(base, valid, 5, 5, 100);
  for (let i = 0; i < valid.length; i++) {
    assert.ok(Math.abs(result.positions[i * 3 + 1] - (valid[i] ? 0.05 : 0)) < 1e-8);
  }
});

function renderer_harness() {
  const pending = [], rendered = [], removed = [], colored = [];
  let requests = 0;
  class Component { setState(update, callback) {
    this.state = { ...this.state, ...(typeof update === "function" ? update(this.state) : update) };
    callback?.();
  } }
  const original = readFileSync(new URL("../src/pages/assets/SimulatorTerrain.jsx", import.meta.url), "utf8")
    .replace(/^import[\s\S]*?;\r?\n/gm, "").replace("export default class", "class");
  class Loader {
    load(request) { requests++; return new Promise((resolve, reject) => pending.push({
      request, reject, resolve: ({ canvas_buffer }) => {
        colored.push(canvas_buffer);
        const data = terrain_mesh_data(canvas_buffer, 2);
        resolve({ ...data, base_positions: data.positions.slice(), smoothing: request.smoothing,
          pixels: new Uint8ClampedArray(data.width * data.height * 4) });
      },
    })); }
    cancel() {}
  }
  const sandbox = {
    React: { createRef: () => ({ current: null }) }, Component,
    PropTypes: { number: { isRequired: () => null }, object: () => null },
    THREE,
    SimulatorTerrainLoader: Loader, terrain_resolution, TERRAIN_RESOLUTIONS, TERRAIN_PREVIEW_SIZE,
    terrain_smoothing, KEY_ASSETS_SIMULATOR_SMOOTHING: "smoothing",
    KEY_NAVIGATOR_STRATEGY: "strategy", KEY_ASSETS_SIMULATOR_RESOLUTION: "resolution",
    AppSettings: { get: (key) => key === "resolution" ? 129 : "turbo", unsubscribe: () => {} },
    TilesBackend: { canvas_buffer_url: (_endpoint, params) => String(params.width_px) },
    FractoCanvasBuffer: { buffer_to_canvas: (data) => colored.push(data) },
    document: { createElement: () => ({ getContext: () => ({}) }) },
    console: { error: () => {} }, clearTimeout, setTimeout,
  };
  vm.runInNewContext(transformSync(`${original}\nglobalThis.Preview = SimulatorTerrain;`, { loader: "jsx" }).code, sandbox);
  const preview = new sandbox.Preview();
  preview.props = { focal_point: { x: 0, y: 0 }, scope: 2 };
  preview.scene = { add: (mesh) => rendered.push(mesh), remove: (mesh) => removed.push(mesh) };
  preview.controls = { dispose: () => {} };
  preview.set_view = () => {};
  return { preview, pending, rendered, removed, colored, requests: () => requests };
}

const buffer = [[[0, 10], [1, 20]], [[2, 30], [0, 40]]];

test("terrain preserves the standard raster palette without lighting or color blending", async () => {
  const { preview, pending, colored } = renderer_harness();
  const loading = preview.load(0);
  pending[0].resolve({ canvas_buffer: buffer });
  await loading;
  assert.equal(colored.length, 1);
  assert.equal(colored[0], buffer);
  const material = preview.mesh.material;
  assert.equal(material.isMeshBasicMaterial, true);
  assert.equal(material.toneMapped, false);
  assert.equal(material.color.getHex(), 0xffffff);
  assert.equal(material.map.colorSpace, THREE.SRGBColorSpace);
  assert.equal(material.map.minFilter, THREE.NearestFilter);
  assert.equal(material.map.magFilter, THREE.NearestFilter);
  assert.equal(material.map.generateMipmaps, false);
  assert.equal(material.map.flipY, true);
  assert.equal(preview.mesh.geometry.getAttribute("normal"), undefined);
  preview.componentWillUnmount();
});

test("late responses cannot replace current terrain; wireframe reuses data", async () => {
  const { preview, pending, rendered, removed, requests } = renderer_harness();
  preview.sequence = 1;
  const first = preview.load(1);
  preview.sequence = 2;
  const second = preview.load(2);
  pending[1].resolve({ canvas_buffer: buffer });
  await second;
  pending[0].resolve({ canvas_buffer: buffer });
  await first;
  assert.equal(rendered.length, 1);
  assert.equal(preview.state.status, "ready");
  preview.toggle_wireframe();
  assert.equal(preview.mesh.material.wireframe, true);
  assert.equal(requests(), 2);
  const mesh = preview.mesh;
  preview.componentWillUnmount();
  assert.equal(removed.length, 1);
  assert.equal(preview.mesh, null);
});

for (const size of [1000, 1500, 2000]) test(`${size}-edge geometry uses preallocated 32-bit indices and no extra vertex attributes`, () => {
  const row = Array(size).fill([1, 1000]);
  const data = terrain_mesh_data(Array(size).fill(row), 2.5);
  assert.ok(data.indices instanceof Uint32Array);
  assert.equal(data.indices.length, 6 * (size - 1) ** 2);
  assert.equal(data.positions.length, size * size * 3);
  assert.equal(data.uvs.length, size * size * 2);
  assert.equal(data.indices.at(-1), size * size - 1);
  assert.equal(data.positions.byteLength + data.uvs.byteLength + data.indices.byteLength,
    size * size * 20 + 6 * (size - 1) ** 2 * 4);
  const smoothed = smooth_terrain_positions(data.positions, data.valid, size, size, 100);
  assert.equal(smoothed.positions.length, data.positions.length);
  assert.ok(smoothed.max_height <= 2.5 / 15);
  assert.throws(() => terrain_mesh_data(Array(2001).fill(row), 1));
  assert.equal(terrain_resolution(size), size);
  assert.equal(terrain_resolution(2001), 500);
});

test("coarse preview precedes detail; refinement keeps camera and detail failure keeps preview", async () => {
  const { preview, pending, rendered, removed } = renderer_harness();
  preview.state.resolution = 2000;
  const views = [];
  preview.set_view = (view) => views.push(view);
  const loading = preview.load(0);
  assert.equal(pending[0].request.url, "129");
  pending[0].resolve({ canvas_buffer: buffer });
  await setImmediate();
  assert.equal(preview.state.status, "refining");
  assert.equal(pending[1].request.url, "2000");
  pending[1].resolve({ canvas_buffer: buffer });
  await loading;
  assert.equal(rendered.length, 2);
  assert.equal(removed.length, 1);
  assert.deepEqual(views, ["oblique"]);
  assert.equal(preview.state.status, "ready");
  const next = renderer_harness();
  next.preview.state.resolution = 500;
  const failure = next.preview.load(0);
  next.pending[0].resolve({ canvas_buffer: buffer });
  await setImmediate();
  next.pending[1].reject(new Error("offline"));
  await failure;
  assert.equal(next.preview.state.status, "detail_failed");
  assert.ok(next.preview.mesh);
});

test("loader terminates cancelled workers, ignores their results and reports failures", async () => {
  const workers = [];
  const loader = new SimulatorTerrainLoader(() => {
    const worker = { terminate() { this.terminated = true; }, postMessage(request) { this.request = request; } };
    workers.push(worker); return worker;
  });
  const first = loader.load({ url: "first" });
  const cancelled = assert.rejects(first, { name: "AbortError" });
  const second = loader.load({ url: "second" });
  workers[0].onmessage({ data: { stale: true } });
  workers[1].onmessage({ data: { current: true } });
  await cancelled;
  assert.deepEqual(await second, { current: true });
  assert.ok(workers.every((worker) => worker.terminated));
  const third = loader.load({ url: "third" });
  workers[2].onmessage({ data: { error: "offline" } });
  await assert.rejects(third, /offline/);
  const fourth = loader.load({ url: "fourth" });
  const rejection = assert.rejects(fourth, { name: "AbortError" });
  loader.cancel();
  await rejection;
});

test("worker uses standard palette and transfers geometry and pixels", async () => {
  let colors, posted, transfers, fetch_count = 0;
  const code = readFileSync(new URL("../src/pages/assets/SimulatorTerrain.worker.js", import.meta.url), "utf8")
    .replace(/^import[\s\S]*?;\r?\n/gm, "");
  const self = { postMessage: (data, buffers) => { posted = data; transfers = buffers; } };
  class Canvas {
    getContext() { return { getImageData: () => ({ data: new Uint8ClampedArray(16) }) }; }
  }
  vm.runInNewContext(code, { self, terrain_mesh_data, smooth_terrain_positions, OffscreenCanvas: Canvas,
    FractoCanvasBuffer: { buffer_to_canvas: (data) => { colors = data; } },
    fetch: async () => { fetch_count++; return { ok: true, json: async () => ({ canvas_buffer: buffer }) }; },
  });
  await self.onmessage({ data: { url: "terrain", scope: 2 } });
  assert.equal(colors, buffer);
  assert.ok(posted.indices instanceof Uint32Array);
  assert.equal(posted.pixels.length, 16);
  assert.equal(transfers.length, 4);
  const raw = terrain_mesh_data(buffer, 2);
  const expected = smooth_terrain_positions(raw.positions, raw.valid, raw.width, raw.height, 100);
  assert.deepEqual(posted.positions, expected.positions);
  assert.equal(posted.base_positions, undefined);
  assert.equal(posted.valid, undefined);
  await self.onmessage({ data: { url: "terrain", scope: 2, smoothing: 0 } });
  assert.deepEqual(posted.positions, expected.positions);
  assert.equal(fetch_count, 2);
});

test("unmount invalidates pending work and endpoint failures report failed state", async () => {
  const { preview, pending, rendered } = renderer_harness();
  const first = preview.load(0);
  preview.componentWillUnmount();
  pending[0].resolve({ canvas_buffer: buffer });
  await first;
  assert.equal(rendered.length, 0);
  const next = renderer_harness();
  const failure = next.preview.load(0);
  next.pending[0].reject(new Error("offline"));
  await failure;
  assert.equal(next.preview.state.status, "failed");
});
