import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import * as THREE from "three";
import { terrain_height, terrain_mesh_data } from "../src/pages/assets/SimulatorTerrainData.js";

test("height mapping is monotonic, bounded at 0.25 and rejects invalid counts", () => {
  const heights = [0, 1, 10, 1000, 1e6, 1e9].map(terrain_height);
  assert.equal(heights[0], 0);
  assert.equal(heights.at(-1), 0.25);
  assert.ok(heights.every((height, i) => height >= 0 && height <= 0.25 && (!i || height >= heights[i - 1])));
  for (const invalid of [-1, NaN, Infinity, null]) assert.equal(terrain_height(invalid), null);
});

test("mesh preserves column-major values, real/imaginary orientation and texture centers", () => {
  const data = terrain_mesh_data([[[0, 1], [1, 1000]], [[2, 10], [0, 1e6]]], 2);
  assert.equal(data.positions[0], -1);
  assert.equal(data.positions[2], -1);
  assert.ok(Math.abs(data.positions[1] - terrain_height(1)) < 1e-7);
  assert.ok(Math.abs(data.positions[4] - terrain_height(10)) < 1e-7);
  assert.equal(data.positions[10], 0.25);
  assert.deepEqual([...data.uvs.slice(0, 2)], [0.25, 0.75]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
  geometry.setIndex(data.indices);
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

function renderer_harness() {
  const pending = [], rendered = [], removed = [], colored = [];
  let requests = 0;
  class Component { setState(update, callback) {
    this.state = { ...this.state, ...(typeof update === "function" ? update(this.state) : update) };
    callback?.();
  } }
  const original = readFileSync(new URL("../src/pages/assets/SimulatorTerrain.jsx", import.meta.url), "utf8")
    .replace(/^import[\s\S]*?;\r?\n/gm, "").replace("export default class", "class");
  class Texture { dispose() { this.disposed = true; } }
  const sandbox = {
    React: { createRef: () => ({ current: null }) }, Component,
    PropTypes: { number: { isRequired: () => null }, object: () => null },
    THREE: { ...THREE, CanvasTexture: Texture },
    terrain_mesh_data, KEY_NAVIGATOR_STRATEGY: "strategy",
    AppSettings: { get: () => "turbo", unsubscribe: () => {} },
    TilesBackend: { canvas_buffer: () => { requests++; return new Promise((resolve, reject) => pending.push({ resolve, reject })); } },
    FractoCanvasBuffer: { buffer_to_canvas: (data) => colored.push(data) },
    document: { createElement: () => ({ getContext: () => ({}) }) },
    console: { error: () => {} }, clearTimeout,
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
  preview.componentWillUnmount();
});

test("late responses cannot replace current terrain; wireframe reuses data", async () => {
  const { preview, pending, rendered, requests } = renderer_harness();
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
  assert.equal(mesh.material.map.disposed, true);
  assert.equal(preview.mesh, null);
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
