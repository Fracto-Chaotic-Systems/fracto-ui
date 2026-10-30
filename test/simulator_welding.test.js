import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  terrain_boundary_data,
  weld_equal_level_edges,
  TERRAIN_VERTEX_EDGE as EDGE,
} from "../src/pages/assets/SimulatorTerrainEdges.js";
import SimulatorTerrainWelding from "../src/pages/assets/SimulatorTerrainWelding.js";
import { weld_terrain_edges } from "../src/pages/assets/SimulatorTerrainTransitions.js";
import { TerrainLighting } from "../src/pages/assets/SimulatorTerrainLighting.js";
import SimulatorTerrainSurface from "../src/pages/assets/SimulatorTerrainSurface.js";

function geometry(height) {
  const positions = new Float32Array(EDGE * EDGE * 3),
    indices = new Uint32Array(256 * 256 * 6);
  let used = 0;
  for (let y = 0; y < EDGE; y++)
    for (let x = 0; x < EDGE; x++) {
      const vertex = y * EDGE + x;
      positions.set(
        [
          x / 256,
          typeof height === "function" ? height(x, y) : height,
          y / 256,
        ],
        vertex * 3,
      );
      if (x && y) {
        const a = vertex - EDGE - 1,
          b = vertex - EDGE,
          c = vertex - 1;
        indices.set([a, c, b, b, c, vertex], used);
        used += 6;
      }
    }
  const result = new THREE.BufferGeometry();
  result.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  result.setAttribute(
    "uv",
    new THREE.BufferAttribute(new Float32Array(EDGE * EDGE * 2), 2),
  );
  result.setIndex(new THREE.BufferAttribute(indices, 1));
  return result;
}
const placement = (short_code, height, mirror_y = false) => {
  const data = geometry(height);
  const boundary = terrain_boundary_data(
    data.attributes.position.array,
    data.index.array,
  );
  data.dispose();
  return { short_code, mirror_y, boundary };
};
const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

// Physical edge access, independent of reflected native vertex ordering.
const edgeOffset = (patch, side, i) =>
  (patch.mirror_y && side % 2 === 0 ? 2 - side : side) * EDGE +
  (patch.mirror_y && side % 2 ? 256 - i : i);

test("2:1 transitions close all four directions and reflected boundaries without T-junctions", () => {
  const cases = [
    ["00", ["010", "012"], 3],
    ["01", ["001", "003"], 1],
    ["00", ["020", "021"], 0],
    ["02", ["002", "003"], 2],
  ];
  for (const [code, children, nativeSide] of cases)
    for (const mirror of [false, true]) {
      const side = mirror && nativeSide % 2 === 0 ? 2 - nativeSide : nativeSide;
      const inputs = [
        placement(code, (x, y) => (x + 2 * y) / 768, mirror),
        ...children.map((child) => placement(child, 1, mirror)),
      ];
      const originals = inputs.map((p) => p.boundary.heights.slice());
      const [coarse, ...fine] = weld_terrain_edges(inputs);
      fine.sort((a, b) => (side % 2 ? a.row - b.row : a.column - b.column));
      for (let half = 0; half < 2; half++)
        for (let i = 0; i <= 256; i++) {
          const patch = fine[half],
            offset = edgeOffset(patch, side, i),
            anchor = i - (i % 2);
          const expected =
            coarse.heights[
              edgeOffset(coarse, (side + 2) % 4, half * 128 + anchor / 2)
            ];
          close(patch.heights[offset], expected);
          const coordinate =
            patch.coordinates?.[offset] ?? (offset % EDGE) / 256;
          close(
            coordinate,
            mirror && side % 2 ? 1 - anchor / 256 : anchor / 256,
          );
        }
      // Both entries at the child junction agree, including the perpendicular fine edge.
      for (const patch of fine)
        for (const x of [0, 1])
          for (const y of [0, 1])
            assert.equal(
              patch.heights[edgeOffset(patch, y ? 2 : 0, x * 256)],
              patch.heights[edgeOffset(patch, x ? 1 : 3, y * 256)],
            );
      inputs.forEach((p, i) =>
        assert.deepEqual(p.boundary.heights, originals[i]),
      );
      const reversed = weld_terrain_edges([...inputs].reverse()).reverse();
      reversed.forEach((p, i) =>
        assert.deepEqual(
          p.heights,
          [coarse, ...weld_terrain_edges(inputs).slice(1)][i].heights,
        ),
      );
    }
});

test("transition collapse respects missing boundary segments and absent coarse data", () => {
  const coarse = placement("00", 0),
    fine = placement("010", 1);
  fine.boundary.segments[3 * 256 + 10] = 0;
  let result = weld_terrain_edges([coarse, fine])[1];
  assert.equal(
    result.coordinates[3 * EDGE + 11],
    11 / 256,
    "do not collapse across a missing fine segment",
  );
  coarse.boundary.valid.fill(0);
  result = weld_terrain_edges([coarse, fine])[1];
  assert.equal(result.changed, false);
  const data = geometry(0),
    sparse = terrain_boundary_data(
      data.attributes.position.array,
      new Uint32Array([0, 1, EDGE]),
    );
  assert.equal(sparse.segments[0], 1);
  assert.equal(sparse.segments[3 * 256], 1);
  assert.equal(sparse.segments[1], 0);
  data.dispose();
});

test("flat coarse/fine surfaces still get GPU coordinate overrides and restore after coarsening", () => {
  const welding = new SimulatorTerrainWelding(),
    source = new THREE.MeshBasicMaterial(),
    data = geometry(0);
  const coarse = mesh("00", data, source),
    fine = mesh("010", data, source);
  welding.apply([coarse, fine]);
  assert.notEqual(fine.material, source);
  const texture = shader(fine.material).uniforms.fractoWeldEdges.value;
  assert.equal(texture.format, THREE.RGFormat);
  assert.equal(texture.image.data[(3 * EDGE + 11) * 2 + 1], 10 / 256);
  welding.apply([fine]);
  assert.equal(fine.material, source);
  welding.dispose();
  source.dispose();
  data.dispose();
});

test("same-level horizontal and vertical neighbors share heights and all four corner values agree", () => {
  const input = [
    placement("00", 0),
    placement("01", 0.4),
    placement("02", 0.8),
    placement("03", 1),
  ];
  const originals = input.map((p) => p.boundary.heights.slice());
  const [a, b, c, d] = weld_equal_level_edges(input);
  close(a.heights[EDGE + 100], 0.2);
  assert.equal(a.heights[EDGE + 100], b.heights[3 * EDGE + 100]);
  close(a.heights[2 * EDGE + 100], 0.4);
  assert.equal(a.heights[2 * EDGE + 100], c.heights[100]);
  const corner = [
    a.heights[EDGE + 256],
    a.heights[2 * EDGE + 256],
    b.heights[2 * EDGE],
    b.heights[4 * EDGE - 1],
    c.heights[256],
    c.heights[EDGE],
    d.heights[0],
    d.heights[3 * EDGE],
  ];
  assert.ok(corner.every((height) => height === corner[0]));
  close(corner[0], 0.55);
  assert.equal(a.heights[100], 0, "unshared outer edge stays unchanged");
  for (let i = 0; i < input.length; i++)
    assert.deepEqual(input[i].boundary.heights, originals[i]);
});

test("mirrored edges use physical neighbors and independent overrides", () => {
  const [upper, lower, neighbor] = weld_equal_level_edges([
    placement("00", 0),
    placement("00", 0, true),
    placement("01", 1),
  ]);
  close(upper.heights[EDGE + 90], 0.5);
  close(neighbor.heights[3 * EDGE + 90], 0.5);
  assert.equal(
    lower.changed,
    false,
    "distant mirrored placement must not inherit the weld",
  );
  const [south, north] = weld_equal_level_edges([
    placement("00", 0.2, true),
    placement("02", 0.8, true),
  ]);
  close(south.heights[2 * EDGE + 50], 0.5);
  assert.equal(south.heights[2 * EDGE + 50], north.heights[50]);
  const [left, right] = weld_equal_level_edges([
    placement("00", (_x, y) => y / 512, true),
    placement("01", (_x, y) => 0.2 + y / 512, true),
  ]);
  close(left.heights[EDGE + 200], 0.1 + 200 / 512);
  assert.equal(left.heights[EDGE + 200], right.heights[3 * EDGE + 200]);
});

test("equal-level pass ignores coarse/fine borders, absent neighbors, and non-surface vertices", () => {
  const mixed = weld_equal_level_edges([
    placement("00", 0),
    placement("010", 1),
    placement("012", 1),
  ]);
  assert.ok(mixed.every((patch) => !patch.changed));
  const a = placement("00", 0),
    b = placement("01", 1);
  b.boundary.valid.fill(0);
  assert.ok(weld_equal_level_edges([a, b]).every((patch) => !patch.changed));
  const data = geometry(0.5),
    sparse = terrain_boundary_data(
      data.attributes.position.array,
      new Uint32Array([0, 1, EDGE]),
    );
  assert.equal(sparse.valid[0], 1);
  assert.equal(sparse.valid[1], 1);
  assert.equal(sparse.valid[3 * EDGE + 1], 1);
  assert.equal(sparse.valid[EDGE + 100], 0);
  assert.equal(sparse.valid[2 * EDGE + 100], 0);
  data.dispose();
});

test("coarse corner welding remains authoritative at a coarse/fine junction", () => {
  const [upper, lower, fine] = weld_terrain_edges([
    placement("00", 0),
    placement("02", 1),
    placement("012", 0.2),
  ]);
  assert.equal(upper.heights[2 * EDGE + 256], 0.5);
  assert.equal(lower.heights[256], 0.5);
  assert.equal(fine.heights[3 * EDGE + 256], 0.5);
  assert.equal(fine.heights[2 * EDGE], 0.5);
});

function mesh(code, data, material, mirror_y = false) {
  const result = new THREE.Mesh(data, material);
  result.userData = { short_code: code, mirror_y };
  return result;
}

test("vertical terrain sampling interpolates reflected triangles and respects missing surface", () => {
  const surface = new SimulatorTerrainSurface(),
    material = new THREE.MeshBasicMaterial();
  const data = geometry((x, z) => (x + z) / 512),
    terrain = mesh("00", data, material);
  terrain.position.set(1, 5, 4);
  terrain.scale.set(2, 3, -2);
  close(surface.height_at([terrain], 2, 3), 6.5);
  assert.equal(surface.height_at([terrain], 99, 99), null);
  const sparse = geometry(0.5);
  sparse.setIndex(new THREE.BufferAttribute(new Uint32Array([0, EDGE, 1]), 1));
  const hole = mesh("00", sparse, material);
  assert.equal(surface.height_at([hole], 0.5, 0.5), null);
  close(surface.height_at([hole], 0.25 / 256, 0.25 / 256), 0.5);
  data.dispose();
  sparse.dispose();
  material.dispose();
});

test("clearance queries follow actual shader-welded equal and mixed-resolution boundaries", () => {
  const welding = new SimulatorTerrainWelding(),
    surface = new SimulatorTerrainSurface(),
    material = new THREE.MeshBasicMaterial();
  const data = geometry(0),
    other = geometry(1);
  const a = mesh("00", data, material),
    b = mesh("01", other, material);
  b.position.x = 1;
  welding.apply([a, b]);
  close(surface.height_at([a], 1, 0.3), 0.5);
  close(surface.height_at([b], 1, 0.3), 0.5);
  const ramp = geometry((_x, z) => z / 256),
    coarse = mesh("00", ramp, material),
    fine = mesh("010", other, material);
  fine.position.x = 1;
  fine.scale.set(0.5, 1, 0.5);
  welding.apply([coarse, fine]);
  close(surface.height_at([fine], 1, 11 / 512), 11 / 512);
  close(
    surface.height_at([fine], 1, 11 / 512),
    surface.height_at([coarse], 1, 11 / 512),
  );
  welding.apply([fine]);
  assert.equal(fine.userData.terrain_edges, undefined);
  close(surface.height_at([fine], 1, 11 / 512), 1);
  welding.dispose();
  data.dispose();
  other.dispose();
  ramp.dispose();
  material.dispose();
});
function shader(material) {
  const result = {
    uniforms: {},
    vertexShader: THREE.ShaderLib.basic.vertexShader,
    fragmentShader: THREE.ShaderLib.basic.fragmentShader,
  };
  material.onBeforeCompile(result, {});
  return result;
}
test("GPU edge overrides preserve shared geometry, texture colors, lighting and untouched mirrored placements", () => {
  const welding = new SimulatorTerrainWelding(),
    lighting = new TerrainLighting();
  const source = new THREE.MeshBasicMaterial({
    map: new THREE.DataTexture(new Uint8Array(4), 1, 1),
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  lighting.attach(source);
  const data = geometry(0),
    other = geometry(1),
    original = data.attributes.position.array.slice();
  const upper = mesh("00", data, source),
    lower = mesh("00", data, source, true),
    neighbor = mesh("01", other, source);
  welding.apply([upper, lower, neighbor]);
  assert.notEqual(upper.material, source);
  assert.equal(lower.material, source);
  assert.equal(upper.geometry, lower.geometry);
  assert.equal(upper.material.map, source.map);
  assert.deepEqual(data.attributes.position.array, original);
  const compiled = shader(upper.material),
    texture = compiled.uniforms.fractoWeldEdges.value;
  close(texture.image.data[(EDGE + 100) * 2], 0.5);
  assert.equal(texture.image.width, 4 * EDGE);
  assert.equal(texture.image.height, 1);
  assert.equal(
    compiled.uniforms.terrainAmbient,
    lighting.uniforms.terrainAmbient,
  );
  assert.match(compiled.vertexShader, /texture2D\(fractoWeldEdges/);
  assert.ok(
    compiled.vertexShader.indexOf("float weldIndex") <
      compiled.vertexShader.indexOf("vTerrainPosition ="),
  );
  assert.notEqual(
    upper.material.customProgramCacheKey(),
    source.customProgramCacheKey(),
  );
  assert.ok(upper.boundingSphere.radius >= Math.sqrt(3) / 2);
  const material = upper.material,
    version = texture.version;
  welding.apply([upper, lower, neighbor]);
  assert.equal(upper.material, material);
  assert.equal(texture.version, version);
  welding.wireframe(true);
  assert.equal(upper.material.wireframe, true);
  let disposed = 0;
  texture.addEventListener("dispose", () => disposed++);
  welding.apply([upper]);
  assert.equal(upper.material, source);
  assert.equal(upper.boundingSphere, undefined);
  assert.equal(disposed, 1);
  assert.equal(
    source.map.image.data.length,
    4,
    "shared color texture remains available",
  );
  welding.dispose();
  source.map.dispose();
  source.dispose();
  data.dispose();
  other.dispose();
});
