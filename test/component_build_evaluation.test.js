import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import * as THREE from "three";
import { construction_builds } from "@fracto/sdk/testing/ConstructionBuilds.js";
import {
  apply_component_commands,
  component_reference_key,
} from "@fracto/sdk/FractoComponentTools.js";
import { component_document_json } from "@fracto/sdk/FractoComponentDocument.js";
import { create_component_content } from "../src/pages/games/ComponentStageContent.js";
import { component_document_reducer as reduce } from "../src/pages/games/ComponentDocumentState.js";
import { component_document_hash } from "../src/pages/games/ComponentProposal.js";

test("representative stage builds retain authored meter scale and restore geometry on undo/redo", async () => {
  const { materials, builds } = construction_builds(randomUUID);
  for (const build of builds) {
    const document = apply_component_commands(
      build.base,
      build.commands,
      materials,
    );
    const plan = {
      contract_version: 1,
      planner_version: "construction-planner-v1",
      proposal_id: randomUUID(),
      applied: false,
      status: "proposal",
      summary: "Evaluation proposal",
      questions: [],
      assumptions: [],
      information_needed: [],
      catalog_matches: [],
      base: {
        document_id: build.base.id,
        document_hash: component_document_hash(build.base),
      },
      commands: build.commands,
      preview: { document_hash: component_document_hash(document) },
    };
    let state = reduce({}, { type: "open", document: build.base, revision: 1 });
    const original = component_document_json(state.history.present);
    state = reduce(state, { type: "apply-proposal", plan, materials });
    assert.equal(state.proposal_result.applied, true, build.id);
    assert.equal(state.history.past.length, 1);
    const statuses = [],
      scene = new THREE.Scene();
    const content = create_component_content({
      scene,
      render() {},
      on_status: (value) => statuses.push(value),
      resolve: async (refs) =>
        Object.fromEntries(
          refs
            .filter(Boolean)
            .map((ref) => [
              component_reference_key(ref),
              materials[component_reference_key(ref)],
            ]),
        ),
      load: async (runtime) => {
        const descriptor = Object.values(materials).find(
            (entry) => entry.material.id === runtime.id,
          ),
          [w, h, d] = descriptor.material.construction.dimensions_m;
        const geometry = new THREE.BoxGeometry(w, h, d);
        geometry.translate(0, h / 2, 0);
        return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
      },
    });
    // Geometry integration uses a neutral floor to avoid network/DOM texture
    // decoding. Textured-floor pins/tiling remain in proposal and SQL checks.
    const render = async (snapshot) => {
      const view = structuredClone(snapshot);
      if (view.floor) {
        view.floor.asset = null;
        view.floor.texture_file = null;
      }
      await content.update(view);
      assert.equal(statuses.at(-1), "content_ready", build.id);
      const expected =
        view.objects.length +
        view.scatters.reduce((sum, item) => sum + item.count, 0) +
        (view.floor ? 1 : 0);
      assert.equal(content.root.children.length, expected, build.id);
    };
    await render(state.history.present);
    for (const child of content.root.children) {
      if (child.userData.component_item_id === "floor") continue;
      const bounds = new THREE.Box3().setFromObject(child),
        height = bounds.max.y - bounds.min.y;
      assert.ok(height > 0 && height <= 12, build.id);
      if (build.expected.area) {
        const a = build.expected.area;
        assert.ok(
          bounds.min.x >= a[0] - 1e-8 &&
            bounds.min.z >= a[1] - 1e-8 &&
            bounds.max.x <= a[2] + 1e-8 &&
            bounds.max.z <= a[3] + 1e-8,
          build.id,
        );
      }
    }
    state = reduce(state, { type: "undo" });
    assert.equal(component_document_json(state.history.present), original);
    await render(state.history.present);
    state = reduce(state, { type: "redo" });
    assert.equal(
      component_document_json(state.history.present),
      component_document_json(document),
    );
    await render(state.history.present);
    content.dispose();
    assert.equal(scene.children.length, 0);
  }
});
