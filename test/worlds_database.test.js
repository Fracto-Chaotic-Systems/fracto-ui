import test from "node:test";
import assert from "node:assert/strict";
import { index_world_mappings } from "../src/pages/games/WorldsDatabase.js";
const row = {
  cardinality: "300",
  synset_id: "99999999",
  word: "new sense outside contenders",
  world_name: "world 300",
  definition: "short from database",
  gloss: "full gloss",
  notes: "database note",
};
test("uses database senses and notes independently of static contenders", () => {
  const data = index_world_mappings([row]);
  assert.equal(data.mapping[300], row.synset_id);
  assert.equal(data.associations[300].definition, row.definition);
  assert.equal(data.notes[300], row.notes);
  assert.equal(data.associations[300].world_name, "world 300");
  assert.deepEqual(index_world_mappings([]), {
    mapping: {},
    associations: {},
    notes: {},
  });
});
test("rejects malformed responses and conflicting mappings", () => {
  for (const rows of [
    null,
    [row, row],
    [{ ...row, cardinality: 0 }],
    [{ ...row, synset_id: "1" }],
    [{ ...row, notes: null }],
  ])
    assert.throws(() => index_world_mappings(rows));
});
