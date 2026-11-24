import assert from "node:assert/strict";
import test from "node:test";
import {
  material_form,
  material_edit_from_form,
} from "../src/pages/games/MaterialMetadataForm.js";
import { material_view } from "@fracto/sdk/FractoMaterialMetadata.js";
test("material forms preserve unknowns and reject partial vectors rather than inventing zeros", () => {
  const material = material_view(
    { id: "grass", name: "Grass", tags: ["grass"] },
    "a".repeat(64),
  );
  const form = material_form(material);
  assert.equal(
    material_edit_from_form(form, material.revision).construction.dimensions_m,
    null,
  );
  assert.throws(
    () =>
      material_edit_from_form(
        { ...form, dimensions_m: "1,,2" },
        material.revision,
      ),
    /invalid_material_metadata/,
  );
  const next = material_edit_from_form(
    { ...form, dimensions_m: "1, 0.2, 1", tags: "Grass, MEADOW" },
    material.revision,
  );
  assert.deepEqual(next.tags, ["grass", "meadow"]);
  assert.deepEqual(next.construction.dimensions_m, [1, 0.2, 1]);
});
