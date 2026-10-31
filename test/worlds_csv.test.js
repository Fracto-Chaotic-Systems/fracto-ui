import test from "node:test";
import assert from "node:assert/strict";
import { worlds_csv } from "../src/pages/games/WorldsCsv.js";
test("exports all associations in numeric order with factorization and edited notes", () => {
  const csv = worlds_csv(
    {
      12: {
        label: "compound",
        world_name: "world 12",
        definition: 'a "quoted", definition',
      },
      1: {
        label: "existence",
        world_name: "custom world name",
        definition: "being",
      },
    },
    { 12: "edited, note\nsecond line", 1: "" },
  );
  assert.equal(
    csv,
    '\uFEFF"cardinality","factorization","wordnet association","name","notes"\r\n"1","1","existence: being","custom world name",""\r\n"12","2^2 x 3","compound: a ""quoted"", definition","world 12","edited, note\nsecond line"\r\n',
  );
});
test("empty tables still export a header", () => {
  assert.equal(
    worlds_csv({}, {}),
    '\uFEFF"cardinality","factorization","wordnet association","name","notes"\r\n',
  );
});
