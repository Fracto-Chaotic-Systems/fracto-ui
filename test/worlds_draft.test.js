import {
  WORLDS_COMPOUNDS,
  WORLDS_COMPOUND_VERSION,
} from "../src/pages/games/WorldsCompounds.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { WORLD_CONTENDERS } from "../src/pages/games/WorldsContenders.js";
import {
  WORLDS_FIRST_ROUND,
  WORLDS_DRAFT_VERSION,
} from "../src/pages/games/WorldsFirstRound.js";
import {
  WORLDS_GAP_FILL,
  WORLDS_GAP_VERSION,
} from "../src/pages/games/WorldsGapFill.js";
import { prepare_worlds_draft } from "../src/pages/games/WorldsDraft.js";
import { prime_factorization } from "../src/pages/games/WorldsMapping.js";
const by_label = Object.fromEntries(
  WORLD_CONTENDERS.map((item) => [item.label, item.id]),
);

test("combined proposals assign all source senses once and supply a note for every assignment", () => {
  const draft = prepare_worlds_draft({}, {}, "", WORLD_CONTENDERS);
  assert.equal(WORLDS_FIRST_ROUND.length, 100);
  assert.equal(Object.keys(draft.mapping).length, 318);
  assert.equal(new Set(Object.values(draft.mapping)).size, 318);
  assert.deepEqual(
    new Set(Object.values(draft.mapping)),
    new Set(WORLD_CONTENDERS.map((item) => item.id)),
  );
  assert.equal(Object.keys(draft.notes).length, 318);
  assert.equal(draft.mapping[15], by_label.learning);
  assert.equal(draft.mapping[65], by_label.memory);
  for (const entry of [
    ...WORLDS_FIRST_ROUND,
    ...WORLDS_GAP_FILL,
    ...WORLDS_COMPOUNDS,
  ]) {
    assert.equal(entry.synset_id, by_label[entry.label]);
    assert.ok(entry.note.length > 40);
    const formula = entry.note.match(
      /^([0-9]+(?:\^[0-9]+)?(?: x [0-9]+(?:\^[0-9]+)?)*):/,
    );
    if (formula) {
      const product = formula[1].split(" x ").reduce((value, term) => {
        const [base, exponent = "1"] = term.split("^");
        return value * Number(base) ** Number(exponent);
      }, 1);
      assert.equal(product, entry.cardinality, entry.label);
    }
    for (const { prime } of prime_factorization(entry.cardinality)) {
      assert.ok(
        draft.mapping[prime],
        `Unexplained prime ${prime} in ${entry.label}`,
      );
    }
  }
});

test("original prime-power placements follow genuine WordNet subtype paths", async () => {
  const graph = JSON.parse(
    await readFile(
      new URL("../public/wordnet/abstract-nouns.json", import.meta.url),
      "utf8",
    ),
  );
  const map = Object.fromEntries(
    WORLDS_FIRST_ROUND.map((entry) => [entry.cardinality, entry.synset_id]),
  );
  const reaches = (ancestor, child) => {
    const pending = [ancestor];
    const seen = new Set();
    while (pending.length) {
      const id = pending.pop();
      if (id === child) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      pending.push(...graph.nodes[id].children);
    }
    return false;
  };
  for (const entry of WORLDS_FIRST_ROUND) {
    const factors = prime_factorization(entry.cardinality);
    if (factors.length === 1 && factors[0].exponent > 1) {
      const { prime, exponent } = factors[0];
      assert.ok(reaches(map[prime], entry.synset_id), entry.label);
      if (exponent > 2 && map[prime ** (exponent - 1)]) {
        assert.ok(
          reaches(map[prime ** (exponent - 1)], entry.synset_id),
          entry.label,
        );
      }
    }
  }
});

test("first application preserves manual row conflicts, moved contenders and notes", () => {
  const saved = { 2: by_label.learning, 999: by_label.relation };
  const notes = {
    2: "My preferred anchor",
    5: "My existing explanation",
    999: "Moved relation",
  };
  const result = prepare_worlds_draft(saved, notes, "", WORLD_CONTENDERS);
  assert.equal(result.mapping[2], by_label.learning);
  assert.equal(result.mapping[999], by_label.relation);
  assert.equal(result.mapping[15], undefined);
  assert.equal(result.notes[2], notes[2]);
  assert.equal(result.notes[5], notes[5]);
  assert.equal(result.notes[999], notes[999]);
  assert.deepEqual(saved, { 2: by_label.learning, 999: by_label.relation });
  assert.equal(
    new Set(Object.values(result.mapping)).size,
    Object.keys(result.mapping).length,
  );
});

test("versioned draft keeps later removals and cleared notes through remounts", () => {
  const initial = prepare_worlds_draft({}, {}, "", WORLD_CONTENDERS);
  delete initial.mapping[15];
  delete initial.notes[65];
  const restored = prepare_worlds_draft(
    initial.mapping,
    initial.notes,
    WORLDS_GAP_VERSION,
    WORLD_CONTENDERS,
  );
  assert.equal(restored.mapping[15], undefined);
  assert.equal(restored.notes[65], undefined);
  assert.equal(Object.keys(restored.mapping).length, 317);
});

test("expansion fills every gap from 1 through 256 without changing the original 100 placements", () => {
  assert.equal(WORLDS_GAP_FILL.length, 198);
  const draft = prepare_worlds_draft({}, {}, "", WORLD_CONTENDERS);
  for (let row = 1; row <= 256; row++) {
    assert.ok(draft.mapping[row], `Missing cardinality ${row}`);
    assert.ok(draft.notes[row], `Missing explanation ${row}`);
  }
  for (const entry of WORLDS_FIRST_ROUND) {
    assert.equal(draft.mapping[entry.cardinality], entry.synset_id);
    assert.equal(draft.notes[entry.cardinality], entry.note);
  }
  assert.equal(draft.version, WORLDS_COMPOUND_VERSION);
});

test("upgrading an existing first round adds only new rows and preserves cleared or edited original entries", () => {
  const mapping = Object.fromEntries(
    WORLDS_FIRST_ROUND.map((entry) => [entry.cardinality, entry.synset_id]),
  );
  const notes = Object.fromEntries(
    WORLDS_FIRST_ROUND.map((entry) => [entry.cardinality, entry.note]),
  );
  delete mapping[15];
  delete notes[65];
  notes[5] = "User explanation";
  const expanded = prepare_worlds_draft(
    mapping,
    notes,
    WORLDS_DRAFT_VERSION,
    WORLD_CONTENDERS,
  );
  assert.equal(Object.keys(expanded.mapping).length, 317);
  assert.equal(expanded.mapping[15], undefined);
  assert.equal(expanded.notes[65], undefined);
  assert.equal(expanded.notes[5], "User explanation");
  assert.equal(expanded.mapping[8], by_label.correlation);
  assert.equal(expanded.mapping[256], by_label.reciprocity);
  delete expanded.mapping[8];
  delete expanded.notes[16];
  const restored = prepare_worlds_draft(
    expanded.mapping,
    expanded.notes,
    expanded.version,
    WORLD_CONTENDERS,
  );
  assert.equal(restored.mapping[8], undefined);
  assert.equal(restored.notes[16], undefined);
});

test("expansion respects an occupied gap and a new contender already placed elsewhere", () => {
  const draft = prepare_worlds_draft(
    { 8: by_label.relation, 999: by_label.inference },
    { 8: "Keep this", 999: "My inference" },
    WORLDS_DRAFT_VERSION,
    WORLD_CONTENDERS,
  );
  assert.equal(draft.mapping[8], by_label.relation);
  assert.equal(draft.notes[8], "Keep this");
  assert.equal(draft.mapping[20], undefined);
  assert.equal(draft.mapping[999], by_label.inference);
  assert.equal(draft.notes[999], "My inference");
});

test("new power notes correctly distinguish verified base ancestry from creative family placement", async () => {
  const graph = JSON.parse(
    await readFile(
      new URL("../public/wordnet/abstract-nouns.json", import.meta.url),
      "utf8",
    ),
  );
  const draft = prepare_worlds_draft({}, {}, "", WORLD_CONTENDERS);
  for (const entry of WORLDS_GAP_FILL.filter((item) => item.taxonomy_base)) {
    const pending = [draft.mapping[entry.taxonomy_base]];
    const seen = new Set();
    let found = false;
    while (pending.length) {
      const id = pending.pop();
      if (id === entry.synset_id) {
        found = true;
        break;
      }
      if (seen.has(id)) continue;
      seen.add(id);
      pending.push(...graph.nodes[id].children);
    }
    assert.equal(entry.is_a_verified, found, entry.label);
    if (!found) assert.match(entry.note, /creative|interpretive/i);
  }
});

test("approved compound additions occupy new rows and introduce no new prime archetypes", () => {
  assert.equal(WORLDS_COMPOUNDS.length, 20);
  const previous = [...WORLDS_FIRST_ROUND, ...WORLDS_GAP_FILL];
  const occupied = new Set(previous.map((entry) => entry.cardinality));
  const used_senses = new Set(previous.map((entry) => entry.synset_id));
  const primes = new Set(
    previous
      .filter((entry) => {
        const factors = prime_factorization(entry.cardinality);
        return factors.length === 1 && factors[0].exponent === 1;
      })
      .map((entry) => entry.cardinality),
  );
  for (const entry of WORLDS_COMPOUNDS) {
    assert.ok(!occupied.has(entry.cardinality), entry.label);
    assert.ok(!used_senses.has(entry.synset_id), entry.label);
    const factors = prime_factorization(entry.cardinality);
    assert.ok(factors.reduce((total, item) => total + item.exponent, 0) > 1);
    for (const factor of factors) assert.ok(primes.has(factor.prime));
  }
});

test("gap-version upgrade adds the approved twenty while preserving prior edits and later removals", () => {
  const previous = [...WORLDS_FIRST_ROUND, ...WORLDS_GAP_FILL];
  const mapping = Object.fromEntries(
    previous.map((entry) => [entry.cardinality, entry.synset_id]),
  );
  const notes = Object.fromEntries(
    previous.map((entry) => [entry.cardinality, entry.note]),
  );
  delete mapping[8];
  delete notes[21];
  notes[15] = "Edited learning explanation";
  const expanded = prepare_worlds_draft(
    mapping,
    notes,
    WORLDS_GAP_VERSION,
    WORLD_CONTENDERS,
  );
  assert.equal(Object.keys(expanded.mapping).length, 317);
  assert.equal(expanded.mapping[8], undefined);
  assert.equal(expanded.notes[21], undefined);
  assert.equal(expanded.notes[15], "Edited learning explanation");
  for (const entry of WORLDS_COMPOUNDS) {
    assert.equal(expanded.mapping[entry.cardinality], entry.synset_id);
    assert.equal(expanded.notes[entry.cardinality], entry.note);
  }
  delete expanded.mapping[447];
  delete expanded.notes[511];
  const restored = prepare_worlds_draft(
    expanded.mapping,
    expanded.notes,
    expanded.version,
    WORLD_CONTENDERS,
  );
  assert.equal(restored.mapping[447], undefined);
  assert.equal(restored.notes[511], undefined);
});
