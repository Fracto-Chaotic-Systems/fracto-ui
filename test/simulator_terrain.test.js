import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import * as THREE from "three";
import {
  terrain_height,
  terrain_mesh_data,
  terrain_resolution,
  TERRAIN_RESOLUTIONS,
} from "../src/pages/assets/SimulatorTerrainData.js";
import SimulatorTerrainLoader from "../src/pages/assets/SimulatorTerrainLoader.js";
import {
  terrain_smoothing,
  smooth_terrain_positions,
} from "../src/pages/assets/SimulatorTerrainSmoothing.js";
import {
  TerrainLighting,
  normalize_terrain_lighting,
} from "../src/pages/assets/SimulatorTerrainLighting.js";

test("height mapping is monotonic, bounded at scope / 25 and rejects invalid counts", () => {
  const heights = [0, 1, 10, 1000, 1e6, 1e9].map((iteration) =>
    terrain_height(iteration, 2.5),
  );
  assert.equal(heights[0], 0);
  assert.equal(heights.at(-1), 2.5 / 25);
  assert.ok(
    heights.every(
      (height, i) =>
        height >= 0 && height <= 2.5 / 25 && (!i || height >= heights[i - 1]),
    ),
  );
  for (const invalid of [-1, NaN, Infinity, null])
    assert.equal(terrain_height(invalid, 2.5), null);
  for (const invalid of [0, -1, NaN, Infinity, undefined])
    assert.throws(() => terrain_height(10, invalid), RangeError);
});

test("all terrain elevations scale proportionally with navigator scope", () => {
  const buffer = [
    [
      [0, 10],
      [1, 1000],
    ],
    [
      [2, 1000000],
      [0, 1e9],
    ],
  ];
  for (const scope of [2.5, 1, 0.01, 1e-8]) {
    const data = terrain_mesh_data(buffer, scope);
    assert.ok(Math.abs(data.max_height - scope / 25) <= scope * 1e-12);
    for (let i = 0; i < data.positions.length / 3; i++) {
      assert.ok(data.positions[i * 3 + 1] <= scope / 25 + scope * 1e-8);
    }
    assert.ok(
      Math.abs(terrain_height(1000, scope) / scope - terrain_height(1000, 1)) <
        1e-12,
    );
  }
});

test("mesh preserves column-major values, real/imaginary orientation and texture centers", () => {
  const data = terrain_mesh_data(
    [
      [
        [0, 1],
        [1, 1000],
      ],
      [
        [2, 10],
        [0, 1e6],
      ],
    ],
    2,
  );
  assert.equal(data.positions[0], -1);
  assert.equal(data.positions[2], -1);
  assert.ok(Math.abs(data.positions[1] - terrain_height(1, 2)) < 1e-7);
  assert.ok(Math.abs(data.positions[4] - terrain_height(10, 2)) < 1e-7);
  assert.ok(Math.abs(data.positions[10] - 2 / 25) < 1e-7);
  assert.deepEqual([...data.uvs.slice(0, 2)], [0.25, 0.75]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(data.positions, 3),
  );
  geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
  geometry.computeVertexNormals();
  assert.ok(geometry.attributes.normal.getY(0) > 0);
  geometry.dispose();
});

test("missing samples omit triangles instead of creating artificial terrain", () => {
  const data = terrain_mesh_data(
    [
      [
        [0, 10],
        [1, 20],
      ],
      [[2, 30], null],
    ],
    1,
  );
  assert.equal(data.indices.length, 3);
  assert.ok(!data.indices.includes(3));
  assert.throws(() =>
    terrain_mesh_data(
      [
        [null, null],
        [null, null],
      ],
      1,
    ),
  );
  assert.throws(() => terrain_mesh_data([], 1));
  assert.throws(() => terrain_mesh_data([[[0, 1]], []], 1));
});

test("Gaussian smoothing rounds peaks, blends strength and preserves source data and X/Z", () => {
  const width = 7,
    height = 7;
  const base = new Float32Array(width * height * 3);
  const valid = new Uint8Array(width * height).fill(1);
  const center = 3 * width + 3;
  for (let i = 0; i < valid.length; i++) {
    base[i * 3] = i;
    base[i * 3 + 2] = -i;
  }
  base[center * 3 + 1] = 1 / 25;
  const original = base.slice();
  const zero = smooth_terrain_positions(base, valid, width, height, 0);
  const full = smooth_terrain_positions(base, valid, width, height, 100);
  const half = smooth_terrain_positions(base, valid, width, height, 50);
  assert.deepEqual(zero.positions, base);
  assert.deepEqual(base, original);
  assert.ok(full.positions[center * 3 + 1] < base[center * 3 + 1]);
  assert.ok(full.positions[(center + 1) * 3 + 1] > 0);
  assert.ok(full.max_height <= 1 / 25);
  assert.ok(
    Math.abs(
      half.positions[center * 3 + 1] -
        (base[center * 3 + 1] + full.positions[center * 3 + 1]) / 2,
    ) < 1e-8,
  );
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
    assert.ok(
      Math.abs(result.positions[i * 3 + 1] - (valid[i] ? 0.05 : 0)) < 1e-8,
    );
  }
});

test("lighting settings are bounded and shader preserves original palette when disabled", () => {
  const lighting = new TerrainLighting();
  lighting.update({
    enabled: true,
    ambient: -1,
    intensity: 99,
    azimuth: 90,
    elevation: 90,
  });
  assert.equal(lighting.uniforms.terrainAmbient.value, 0);
  assert.equal(lighting.uniforms.terrainIntensity.value, 2);
  assert.ok(
    Math.abs(lighting.uniforms.terrainLightDirection.value.y - 1) < 1e-10,
  );
  lighting.update(undefined);
  assert.equal(lighting.uniforms.terrainLightEnabled.value, 0);
  assert.ok(
    Math.abs(lighting.uniforms.terrainLightDirection.value.length() - 1) <
      1e-10,
  );
  const material = new THREE.MeshBasicMaterial();
  lighting.attach(material);
  const shader = {
    uniforms: {},
    vertexShader: THREE.ShaderLib.basic.vertexShader,
    fragmentShader: THREE.ShaderLib.basic.fragmentShader,
  };
  material.onBeforeCompile(shader);
  assert.match(shader.fragmentShader, /if \(terrainLightEnabled > 0.5\)/);
  assert.match(shader.fragmentShader, /dFdx\(vTerrainPosition\)/);
  assert.match(shader.vertexShader, /vTerrainPosition =/);
  assert.equal(
    shader.uniforms.terrainIntensity,
    lighting.uniforms.terrainIntensity,
  );
  material.dispose();
});

for (const size of [1000, 1500, 2000])
  test(`${size}-edge geometry uses preallocated 32-bit indices and no extra vertex attributes`, () => {
    const row = Array(size).fill([1, 1000]);
    const data = terrain_mesh_data(Array(size).fill(row), 2.5);
    assert.ok(data.indices instanceof Uint32Array);
    assert.equal(data.indices.length, 6 * (size - 1) ** 2);
    assert.equal(data.positions.length, size * size * 3);
    assert.equal(data.uvs.length, size * size * 2);
    assert.equal(data.indices.at(-1), size * size - 1);
    assert.equal(
      data.positions.byteLength + data.uvs.byteLength + data.indices.byteLength,
      size * size * 20 + 6 * (size - 1) ** 2 * 4,
    );
    const smoothed = smooth_terrain_positions(
      data.positions,
      data.valid,
      size,
      size,
      100,
    );
    assert.equal(smoothed.positions.length, data.positions.length);
    assert.ok(smoothed.max_height <= 2.5 / 25);
    assert.throws(() => terrain_mesh_data(Array(5001).fill(row), 1));
    assert.equal(terrain_resolution(size), size);
    assert.equal(terrain_resolution(5001), 500);
  });

for (const size of [3500, 5000])
  test(`${size}-edge limits preserve 32-bit indexing in both axes`, () => {
    // Thin fixtures cover the actual edge limits and >65535 vertices without
    // allocating gigabytes in the unit suite. Full-size GPU performance is device-dependent.
    for (const [width, height] of [
      [size, 20],
      [20, size],
    ]) {
      const row = Array(height).fill([1, 1000]);
      const data = terrain_mesh_data(Array(width).fill(row), 2.5);
      assert.equal(data.positions.length, width * height * 3);
      assert.equal(data.indices.length, 6 * (width - 1) * (height - 1));
      assert.ok(data.indices instanceof Uint32Array);
      assert.equal(data.indices.at(-1), width * height - 1);
      assert.ok(data.indices.at(-1) > 65535);
    }
    assert.equal(terrain_resolution(size), size);
  });

test("loader terminates cancelled workers, ignores their results and reports failures", async () => {
  const workers = [];
  const loader = new SimulatorTerrainLoader(() => {
    const worker = {
      terminate() {
        this.terminated = true;
      },
      postMessage(request) {
        this.request = request;
      },
    };
    workers.push(worker);
    return worker;
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

test("loader forwards progress without finishing or accepting cancelled progress", async () => {
  const workers = [],
    progress = [];
  const loader = new SimulatorTerrainLoader(() => {
    const worker = {
      terminate() {
        this.terminated = true;
      },
      postMessage() {},
    };
    workers.push(worker);
    return worker;
  });
  const first = loader.load({}, [], (value) => progress.push(value));
  workers[0].onmessage({ data: { progress: { stage: "mesh", value: 40 } } });
  assert.equal(workers[0].terminated, undefined);
  assert.deepEqual(progress, [{ stage: "mesh", value: 40 }]);
  const cancelled = assert.rejects(first, { name: "AbortError" });
  loader.cancel();
  workers[0].onmessage({ data: { progress: { stage: "mesh", value: 90 } } });
  await cancelled;
  assert.equal(progress.length, 1);
  const next = loader.load({}, [], (value) => progress.push(value));
  workers[1].onmessage({
    data: { progress: { stage: "colors", value: null } },
  });
  workers[1].onmessage({ data: { complete: true } });
  assert.deepEqual(await next, { complete: true });
  assert.equal(progress.at(-1).value, null);
});

test("mesh and smoothing report monotonic measurable progress without changing geometry", () => {
  const mesh_progress = [],
    smoothing_progress = [];
  const data = terrain_mesh_data(buffer, 2, (fraction) =>
    mesh_progress.push(fraction),
  );
  smooth_terrain_positions(
    data.positions,
    data.valid,
    data.width,
    data.height,
    100,
    (fraction) => smoothing_progress.push(fraction),
  );
  for (const values of [mesh_progress, smoothing_progress]) {
    assert.equal(values[0], 0);
    assert.equal(values.at(-1), 1);
    assert.ok(
      values.every(
        (value, index) =>
          value >= 0 && value <= 1 && (!index || value >= values[index - 1]),
      ),
    );
  }
});

const buffer = [
  [
    [0, 10],
    [1, 20],
  ],
  [
    [2, 30],
    [0, 40],
  ],
];
test("worker uses standard palette and transfers geometry and pixels", async () => {
  let colors,
    posted,
    transfers,
    fetch_count = 0;
  const progress = [];
  const code = readFileSync(
    new URL("../src/pages/assets/SimulatorTerrain.worker.js", import.meta.url),
    "utf8",
  ).replace(/^import[\s\S]*?;\r?\n/gm, "");
  const self = {
    postMessage: (data, buffers) => {
      if (data.progress) progress.push(data.progress);
      else {
        posted = data;
        transfers = buffers;
      }
    },
  };
  class Canvas {
    getContext() {
      return { getImageData: () => ({ data: new Uint8ClampedArray(16) }) };
    }
  }
  vm.runInNewContext(code, {
    self,
    terrain_mesh_data,
    smooth_terrain_positions,
    OffscreenCanvas: Canvas,
    FractoCanvasBuffer: {
      buffer_to_canvas: (data) => {
        colors = data;
      },
    },
    fetch: async () => {
      fetch_count++;
      return { ok: true, json: async () => ({ canvas_buffer: buffer }) };
    },
  });
  await self.onmessage({ data: { url: "terrain", scope: 2 } });
  assert.equal(colors, buffer);
  assert.ok(posted.indices instanceof Uint32Array);
  assert.equal(posted.pixels.length, 16);
  assert.equal(transfers.length, 4);
  assert.deepEqual(
    [...new Set(progress.map((value) => value.stage))],
    ["loading", "parsing", "mesh", "smoothing", "colors", "installing"],
  );
  assert.equal(progress.find((value) => value.stage === "loading").value, null);
  assert.equal(
    progress.filter((value) => value.stage === "mesh").at(-1).value,
    100,
  );
  assert.equal(
    progress.filter((value) => value.stage === "smoothing").at(-1).value,
    100,
  );
  const raw = terrain_mesh_data(buffer, 2);
  const expected = smooth_terrain_positions(
    raw.positions,
    raw.valid,
    raw.width,
    raw.height,
    100,
  );
  assert.deepEqual(posted.positions, expected.positions);
  assert.equal(posted.base_positions, undefined);
  assert.equal(posted.valid, undefined);
  await self.onmessage({ data: { url: "terrain", scope: 2, smoothing: 0 } });
  assert.deepEqual(posted.positions, expected.positions);
  assert.equal(fetch_count, 2);
});
