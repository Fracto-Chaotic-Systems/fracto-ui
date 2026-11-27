import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { create_component_document } from "@fracto/sdk/FractoComponentDocument.js";
import { component_document_reducer as reduce } from "../src/pages/games/ComponentDocumentState.js";
import {
  construction_note,
  proposal_note,
  notes_since_save,
} from "../src/pages/games/ComponentEditNotes.js";

const asset = (id) => ({ id, revision: "r1" });

test("construction batches and proposals get short labels", () => {
  assert.equal(
    construction_note([
      {
        type: "place-pattern",
        asset: asset("yard-grass"),
        instances: Array(30).fill({}),
      },
      { type: "place", object: { asset: asset("yard-grass") } },
      { type: "place", object: { asset: asset("ladybug") } },
      { type: "transform" },
      { type: "remove" },
      { type: "remove" },
      { type: "scatter", rule: { count: 12, asset: asset("rock") } },
      { type: "set-floor", floor: { asset: asset("dry-dirt"), size: [1, 20] } },
    ]),
    "placed 31 × yard-grass, placed 1 × ladybug, adjusted 1 object, removed 2 items, scattered 12 × rock, set the floor to dry-dirt (1 × 20 m)",
  );
  assert.equal(construction_note([]), null);
  assert.equal(
    proposal_note({ summary: " Add a fence " }),
    'applied proposal "Add a fence"',
  );
  assert.equal(proposal_note({}), "applied a construction proposal");
  assert.equal(proposal_note({ summary: "x".repeat(300) }).length, 139);
});

test("labels follow undo/redo and only edits since the save are sent", () => {
  const document = create_component_document(randomUUID(), "Path");
  const edit = (state, label, changes) =>
    reduce(state, {
      type: "edit",
      document: { ...state.history.present, ...changes },
      label,
    });
  // A never-saved component sends every labeled edit.
  let state = reduce({}, { type: "open", document, revision: 0 });
  state = edit(state, "adjusted the lighting", {
    lighting: { direction_degrees: 10, intensity: 1 },
  });
  state = edit(state, "adjusted the lighting", {
    lighting: { direction_degrees: 20, intensity: 1 },
  });
  state = edit(state, undefined, { animation_speed: 2 });
  assert.deepEqual(notes_since_save(state), ["adjusted the lighting (×2)"]);
  state = reduce(state, {
    type: "saved",
    document: state.history.present,
    revision: 1,
  });
  assert.deepEqual(notes_since_save(state), []);

  state = reduce(state, {
    type: "construct",
    commands: [
      {
        type: "set-floor",
        floor: { asset: null, size: [5, 10], texture_repeat: [1, 1] },
      },
    ],
    materials: {},
  });
  state = edit(state, "removed 1 item", { animation_speed: 3 });
  assert.deepEqual(notes_since_save(state), [
    "set the floor",
    "removed 1 item",
  ]);
  // Undone edits drop out; redo brings them back.
  state = reduce(state, { type: "undo" });
  assert.deepEqual(notes_since_save(state), ["set the floor"]);
  state = reduce(state, { type: "redo" });
  assert.deepEqual(notes_since_save(state), [
    "set the floor",
    "removed 1 item",
  ]);
  // Undo back to the saved version: nothing to report.
  state = reduce(reduce(state, { type: "undo" }), { type: "undo" });
  assert.deepEqual(notes_since_save(state), []);
  // A new edit after undo replaces the redo branch.
  state = edit(state, "adjusted 2 objects", { animation_speed: 4 });
  assert.deepEqual(notes_since_save(state), ["adjusted 2 objects"]);

  // An edit made while a save is in flight stays reported after it completes.
  const submitted = state.history.present;
  state = edit(state, "removed 3 items", { animation_speed: 5 });
  state = reduce(state, { type: "saved", document: submitted, revision: 2 });
  assert.deepEqual(notes_since_save(state), ["removed 3 items"]);

  // An immediate rename keeps the saved snapshot findable.
  state = reduce(state, {
    type: "renamed",
    document: { ...submitted, name: "Wooded path" },
    revision: 3,
  });
  assert.equal(state.history.present.name, "Wooded path");
  assert.deepEqual(notes_since_save(state), ["removed 3 items"]);
  state = reduce(state, { type: "undo" });
  assert.deepEqual(notes_since_save(state), []);
});

test("reopening a saved component starts with no labels", () => {
  const document = create_component_document(randomUUID(), "Path");
  const state = reduce({}, { type: "open", document, revision: 4 });
  assert.deepEqual(notes_since_save(state), []);
});
