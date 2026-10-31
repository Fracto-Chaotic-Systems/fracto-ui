import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { WORLD_CONTENDERS } from "../src/pages/games/WorldsContenders.js";
import {
  normalize_world_mapping,
  prime_factorization,
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
test("saved mapping rejects invalid rows, unknown IDs and duplicate assignments", () => {
  assert.deepEqual(
    normalize_world_mapping(
      { 0: a, 2: a, 3: a, 4: "bad", 5.5: b, "06": c },
      WORLD_CONTENDERS,
    ),
    { 2: a },
  );
  assert.deepEqual(normalize_world_mapping(null, WORLD_CONTENDERS), {});
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
  assert.equal(WORLD_CONTENDERS.length, 318);
  for (const item of WORLD_CONTENDERS) {
    assert.deepEqual(item.words, graph.nodes[item.id].words);
    assert.equal(item.gloss, graph.nodes[item.id].gloss);
    assert.ok(!("cardinality" in item));
  }
});
