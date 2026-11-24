import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID, createHash } from "node:crypto";
import { construction_builds } from "@fracto/sdk/testing/ConstructionBuilds.js";
import {
  create_component_document,
  component_document_json,
} from "@fracto/sdk/FractoComponentDocument.js";
import { apply_component_commands } from "@fracto/sdk/FractoComponentTools.js";
import {
  component_document_hash,
  prepare_component_proposal,
  replay_component_proposal,
} from "../src/pages/games/ComponentProposal.js";
import {
  component_document_reducer as reduce,
  component_is_dirty,
} from "../src/pages/games/ComponentDocumentState.js";

export function floor_plan(document) {
  const commands = [
    {
      type: "set-floor",
      floor: {
        asset: null,
        size: [4, 12],
        texture_repeat: [1, 1],
        texture_file: null,
      },
    },
  ];
  const preview = apply_component_commands(document, commands, {});
  return {
    contract_version: 1,
    planner_version: "construction-planner-v1",
    proposal_id: randomUUID(),
    applied: false,
    status: "proposal",
    base: {
      document_id: document.id,
      document_hash: component_document_hash(document),
    },
    summary: "A plain floor.",
    questions: [],
    assumptions: [],
    commands,
    information_needed: [],
    catalog_matches: [],
    preview: {
      document_hash: component_document_hash(preview),
      floor: true,
      objects: 0,
      scatter_rules: 0,
      total_instances: 0,
    },
  };
}

test("dense pattern proposals resolve their shared pin and Apply remains one undoable edit", async () => {
  const { materials } = construction_builds(randomUUID);
  const entry = Object.values(materials).find((e) => e.material.id === "grass");
  const asset = { id: entry.material.id, revision: entry.material.revision };
  const document = create_component_document(randomUUID(), "Dense strip");
  const plan = floor_plan(document);
  plan.commands.push({
    type: "place-pattern",
    asset,
    instances: Array.from({ length: 809 }, (_, i) => ({
      id: randomUUID(),
      position: [0, 0, i * 0.01],
      rotation: [0, 0, 0],
      scale: [0.15, 0.15, 0.15],
    })),
  });
  const preview = apply_component_commands(document, plan.commands, materials);
  plan.preview.document_hash = component_document_hash(preview);
  let refs;
  const prepared = await prepare_component_proposal(
    plan,
    document,
    async (references) => {
      refs = references;
      return materials;
    },
    AbortSignal.timeout(5000),
  );
  assert.deepEqual(refs, [asset]);
  assert.equal(prepared.document.objects.length, 809);
  assert.deepEqual(document.objects, []);
  assert.deepEqual(
    replay_component_proposal(plan, document, materials),
    preview,
  );
  await assert.rejects(
    prepare_component_proposal(
      plan,
      document,
      async () => ({}),
      AbortSignal.timeout(5000),
    ),
  );
});
test("proposal previews preserve the draft and Apply forms one dirty undoable snapshot", async () => {
  const document = create_component_document(randomUUID(), "Path");
  document.construction_description = "# Path\n\nRetain a clear corridor.";
  const original = structuredClone(document),
    plan = floor_plan(document);
  assert.equal(
    component_document_hash(document),
    createHash("sha256")
      .update(component_document_json(document))
      .digest("hex"),
  );
  let reads = 0;
  const prepared = await prepare_component_proposal(
    plan,
    document,
    async (refs) => {
      reads++;
      assert.deepEqual(refs, []);
      return {};
    },
    new AbortController().signal,
  );
  assert.equal(reads, 1);
  assert.deepEqual(prepared.document.floor.size, [4, 12]);
  assert.equal(
    prepared.document.construction_description,
    document.construction_description,
  );
  assert.throws(
    () =>
      replay_component_proposal(
        plan,
        { ...document, construction_description: "Changed description" },
        {},
      ),
    /proposal_stale/,
  );
  assert.deepEqual(document, original);
  let state = reduce({}, { type: "open", document, revision: 3 });
  assert.equal(component_is_dirty(state), false);
  state = reduce(state, { type: "apply-proposal", plan, materials: {} });
  assert.equal(state.proposal_result.applied, true);
  assert.equal(state.revision, 3);
  assert.equal(state.history.past.length, 1);
  assert.equal(component_is_dirty(state), true);
  state = reduce(state, { type: "undo" });
  assert.deepEqual(state.history.present, document);
  assert.equal(component_is_dirty(state), false);
  state = reduce(state, { type: "redo" });
  assert.deepEqual(state.history.present, prepared.document);
});
test("atomic Apply rejects stale drafts, another document and tampered preview hashes", () => {
  const document = create_component_document(randomUUID(), "Path"),
    plan = floor_plan(document);
  for (const base of [
    { ...document, name: "New name" },
    { ...document, id: randomUUID() },
  ]) {
    let state = reduce({}, { type: "open", document: base, revision: 1 });
    const before = state.history;
    state = reduce(state, { type: "apply-proposal", plan, materials: {} });
    assert.equal(state.history, before);
    assert.equal(state.proposal_result.applied, false);
    assert.equal(state.construction_error, "proposal_stale");
  }
  assert.throws(
    () =>
      replay_component_proposal(
        { ...plan, preview: { document_hash: "f".repeat(64) } },
        document,
        {},
      ),
    /proposal_invalid/,
  );
  assert.throws(
    () =>
      replay_component_proposal(
        { ...plan, commands: [{ type: "execute", code: "untrusted" }] },
        document,
        {},
      ),
    /invalid_construction_command/,
  );
});
test("preparation propagates stale material failures and rejects cancellation after late resolution", async () => {
  const document = create_component_document(randomUUID(), "Path"),
    plan = floor_plan(document);
  await assert.rejects(
    prepare_component_proposal(
      plan,
      document,
      async () => {
        throw new Error("material_revision_changed");
      },
      new AbortController().signal,
    ),
    /material_revision_changed/,
  );
  const controller = new AbortController();
  await assert.rejects(
    prepare_component_proposal(
      plan,
      document,
      async () => {
        controller.abort();
        return {};
      },
      controller.signal,
    ),
    { name: "AbortError" },
  );
  assert.equal(document.floor, null);
});
