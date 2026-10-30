import test from "node:test";
import assert from "node:assert/strict";
import { build_terrain_tile } from "../../../sdk/terrain/Mesh.js";
import { scale_escape_relief } from "../src/pages/assets/SimulatorEscapeRelief.js";

test("escape scaling precedes log/cap/smoothing and preserves cached buffers and palette samples", () => {
  const tile = Array.from({ length: 256 }, (_, x) =>
    Array.from({ length: 256 }, (_, y) =>
      x === 0 && y === 0 ? null : [x < 128 ? 0 : 3, 100],
    ),
  );
  const original = build_terrain_tile(tile),
    positions = original.positions.slice();
  const boosted = scale_escape_relief(original, 100);
  const expected = build_terrain_tile(
    tile.map((col) =>
      col.map((sample) =>
        sample ? [sample[0], sample[1] * (sample[0] === 0 ? 100 : 1)] : null,
      ),
    ),
  );
  // Away from interfaces, wider smoothing preserves the same pre-log scaling.
  assert.equal(
    boosted.positions[(100 * 257 + 50) * 3 + 1],
    expected.positions[(100 * 257 + 50) * 3 + 1],
  );
  assert.ok(
    Math.abs(boosted.metadata.maximum_height - expected.maximum_height) < 1e-12,
  );
  const high = Math.log1p(10000) / Math.log1p(1000000),
    low = Math.log1p(100) / Math.log1p(1000000);
  assert.ok(
    Math.abs(
      boosted.positions[(100 * 257 + 127) * 3 + 1] -
        (35 * high + 22 * low) / 57,
    ) < 1e-7,
    "boundary blends the pre-log scaled samples with the wider normalized kernel",
  );
  assert.deepEqual(original.positions, positions);
  assert.equal(boosted.indices, original.indices);
  assert.equal(boosted.uvs, original.uvs);
  assert.equal(boosted.patterns, original.patterns);
  assert.equal(boosted.iterations, original.iterations);
  assert.equal(scale_escape_relief(original, 1), original);
  const index = (100 * 257 + 200) * 3 + 1;
  assert.equal(
    boosted.positions[index],
    original.positions[index],
    "pattern interior stays unchanged",
  );
  assert.ok(
    boosted.positions[(100 * 257 + 50) * 3 + 1] >
      original.positions[(100 * 257 + 50) * 3 + 1],
  );
  assert.ok(
    scale_escape_relief(original, 1000000).positions.every(
      (v, i) => i % 3 !== 1 || v <= 1,
    ),
  );
});

test("100x relief rounds jagged escape/pattern interfaces more than the original smoothing", () => {
  const tile = Array.from({ length: 256 }, (_, x) =>
    Array.from({ length: 256 }, (_, y) => [
      x < 128 + (y % 2 ? 1 : -1) ? 0 : 3,
      100,
    ]),
  );
  const base = build_terrain_tile(tile);
  const previous = build_terrain_tile(
    tile.map((col) =>
      col.map(([pattern, count]) => [
        pattern,
        count * (pattern === 0 ? 100 : 1),
      ]),
    ),
  );
  const current = scale_escape_relief(base, 100);
  const max_step = (mesh) => {
    let maximum = 0;
    for (let y = 10; y < 245; y++)
      for (let x = 120; x < 136; x++) {
        const i = (y * 257 + x) * 3 + 1;
        maximum = Math.max(
          maximum,
          Math.abs(mesh.positions[i] - mesh.positions[i + 3]),
          Math.abs(mesh.positions[i] - mesh.positions[i + 257 * 3]),
        );
      }
    return maximum;
  };
  assert.ok(
    max_step(current) < max_step(previous) * 0.8,
    "wider filter reduces the steepest boundary step",
  );
  assert.equal(
    current.positions[(100 * 257 + 50) * 3 + 1],
    previous.positions[(100 * 257 + 50) * 3 + 1],
    "escape plateau keeps the selected 100x elevation",
  );
  assert.equal(
    current.positions[(100 * 257 + 200) * 3 + 1],
    previous.positions[(100 * 257 + 200) * 3 + 1],
    "pattern plateau stays unchanged",
  );
});
