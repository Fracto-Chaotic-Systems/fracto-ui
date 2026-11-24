import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { create_component_document } from "@fracto/sdk/FractoComponentDocument.js";
import {
  component_document_reducer as reduce,
  component_is_dirty as dirty,
} from "../src/pages/games/ComponentDocumentState.js";

test("save retains undo; dirty follows saved snapshot; reload resets history", () => {
  const document = create_component_document(randomUUID(), "Path");
  let state = reduce({}, { type: "open", document, revision: 0 });
  assert.equal(dirty(state), true);
  state = reduce(state, { type: "saved", document, revision: 1 });
  assert.equal(dirty(state), false);
  state = reduce(state, {
    type: "edit",
    document: { ...document, name: "Wooded path" },
  });
  assert.equal(dirty(state), true);
  state = reduce(state, { type: "undo" });
  assert.equal(dirty(state), false);
  state = reduce(state, { type: "redo" });
  const saved = state.history.present;
  state = reduce(state, { type: "saved", document: saved, revision: 2 });
  assert.equal(state.history.past.length, 1);
  state = reduce(state, { type: "undo" });
  assert.equal(state.revision, 2);
  assert.equal(dirty(state), true);
  state = reduce(state, { type: "open", document: saved, revision: 2 });
  assert.equal(state.history.past.length, 0);
  assert.equal(state.history.future.length, 0);
  assert.equal(dirty(state), false);
});
test("construction batches preserve newer names and reject completions for a different document", () => {
  const document = create_component_document(randomUUID(), "Path");
  let state = reduce({}, { type: "open", document, revision: 0 });
  state = reduce(state, {
    type: "edit",
    document: { ...document, name: "Edited while loading" },
  });
  const command = {
    type: "set-floor",
    floor: { asset: null, size: [5, 10], texture_repeat: [1, 1] },
  };
  state = reduce(state, {
    type: "construct",
    commands: [command],
    materials: {},
    expected_id: document.id,
  });
  assert.equal(state.history.present.name, "Edited while loading");
  assert.deepEqual(state.history.present.floor.size, [5, 10]);
  const previous = state;
  state = reduce(state, {
    type: "construct",
    commands: [{ type: "set-floor", floor: null }],
    materials: {},
    expected_id: randomUUID(),
  });
  assert.equal(state.history, previous.history);
  assert.equal(state.construction_error, "construction_document_changed");
});

test("a completed save marks only its submitted snapshot as saved", () => {
  const document = create_component_document(randomUUID(), "Path");
  let state = reduce({}, { type: "open", document, revision: 1 });
  state = reduce(state, {
    type: "edit",
    document: { ...document, name: "Edited during save" },
  });
  state = reduce(state, { type: "saved", document, revision: 2 });
  assert.equal(dirty(state), true);
  assert.equal(state.history.present.name, "Edited during save");
  state = reduce(state, { type: "undo" });
  assert.equal(dirty(state), false);
});
