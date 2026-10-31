import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { WORLD_CONTENDERS } from "../src/pages/games/WorldsContenders.js";
import {
  normalize_world_mapping,
  place_world,
  prime_factorization,
  remove_world,
} from "../src/pages/games/WorldsMapping.js";
const [a, b, c] = WORLD_CONTENDERS.map((item) => item.id);

test("factorization handles identity, primes, powers and mixed factors", () => {
  assert.deepEqual(prime_factorization(1), []);
  assert.deepEqual(prime_factorization(13), [{ prime: 13, exponent: 1 }]);
  assert.deepEqual(prime_factorization(8), [{ prime: 2, exponent: 3 }]);
  assert.deepEqual(prime_factorization(360), [
    { prime: 2, exponent: 3 },
    { prime: 3, exponent: 2 },
    { prime: 5, exponent: 1 },
  ]);
  for (const bad of [0, -1, 1.5, NaN])
    assert.throws(() => prime_factorization(bad));
});
test("moving cards swaps occupied rows and never duplicates associations", () => {
  const original = { 2: a, 3: b };
  assert.deepEqual(place_world(original, 3, a, WORLD_CONTENDERS), {
    2: b,
    3: a,
  });
  assert.deepEqual(original, { 2: a, 3: b });
  assert.deepEqual(place_world(original, 4, a, WORLD_CONTENDERS), {
    3: b,
    4: a,
  });
  assert.deepEqual(place_world(original, 2, a, WORLD_CONTENDERS), original);
});
test("tray assignment replaces without losing the displaced contender and removal clears only its card", () => {
  const result = place_world({ 2: a, 3: b }, 2, c, WORLD_CONTENDERS);
  assert.deepEqual(result, { 2: c, 3: b });
  assert.deepEqual(remove_world(result, c), { 3: b });
  assert.ok(WORLD_CONTENDERS.some((item) => item.id === a));
});
test("saved mapping rejects invalid rows, unknown IDs and duplicate assignments", () => {
  assert.deepEqual(
    normalize_world_mapping(
      { 0: a, 2: a, 3: a, 4: "bad", 5.5: b, "06": c },
      WORLD_CONTENDERS,
    ),
    { 2: a },
  );
  assert.deepEqual(normalize_world_mapping(null, WORLD_CONTENDERS), {});
  assert.deepEqual(place_world({}, 2, "bad", WORLD_CONTENDERS), {});
});
test("every curated contender has the exact source sense and no initial numeric assignment", async () => {
  const graph = JSON.parse(
    await readFile(
      new URL("../public/wordnet/abstract-nouns.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(
    new Set(WORLD_CONTENDERS.map((item) => item.id)).size,
    WORLD_CONTENDERS.length,
  );
  assert.equal(WORLD_CONTENDERS.length, 298);
  for (const item of WORLD_CONTENDERS) {
    assert.deepEqual(item.words, graph.nodes[item.id].words);
    assert.equal(item.gloss, graph.nodes[item.id].gloss);
    assert.ok(!("cardinality" in item));
  }
});
