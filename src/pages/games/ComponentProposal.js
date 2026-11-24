import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { component_document_json } from "@fracto/sdk/FractoComponentDocument.js";
import {
  apply_component_commands,
  require_component_material,
} from "@fracto/sdk/FractoComponentTools.js";

export const component_document_hash = (document) =>
  bytesToHex(
    sha256(new TextEncoder().encode(component_document_json(document))),
  );
const fail = (code = "proposal_invalid") => {
  throw new Error(code);
};
const strings = (value, count, length) =>
  Array.isArray(value) &&
  value.length <= count &&
  value.every((item) => typeof item === "string" && item.length <= length);
export function validate_component_proposal(plan, document) {
  if (
    !plan ||
    plan.contract_version !== 1 ||
    plan.planner_version !== "construction-planner-v1" ||
    plan.applied !== false ||
    !["proposal", "needs_information", "no_changes"].includes(plan.status) ||
    typeof plan.proposal_id !== "string" ||
    !/^[a-f0-9-]{36}$/.test(plan.proposal_id) ||
    typeof plan.summary !== "string" ||
    plan.summary.length > 240 ||
    !strings(plan.questions, 4, 160) ||
    !strings(plan.assumptions, 4, 160) ||
    !Array.isArray(plan.commands) ||
    plan.commands.length > 8 ||
    !Array.isArray(plan.information_needed) ||
    plan.information_needed.length > 4 ||
    !Array.isArray(plan.catalog_matches) ||
    plan.catalog_matches.length > 16 ||
    !plan.preview ||
    !/^[a-f0-9]{64}$/.test(plan.preview.document_hash)
  )
    fail();
  if (
    plan.base?.document_id !== document.id ||
    plan.base?.document_hash !== component_document_hash(document)
  )
    fail("proposal_stale");
  for (const gap of plan.information_needed)
    if (
      !gap ||
      typeof gap.query !== "string" ||
      gap.query.length > 80 ||
      !["not_found", "calibration_required", "no_usable_candidate"].includes(
        gap.reason,
      )
    )
      fail();
  for (const match of plan.catalog_matches)
    if (
      !match ||
      typeof match.id !== "string" ||
      typeof match.name !== "string" ||
      match.name.length > 500 ||
      typeof match.category !== "string" ||
      !/^[a-f0-9]{64}$/.test(match.revision) ||
      !Array.isArray(match.missing_metadata) ||
      !strings(match.missing_metadata, 32, 100)
    )
      fail();
  return structuredClone(plan);
}
export function proposal_references(plan, document) {
  return plan.commands.flatMap((command) => {
    if (!command || typeof command !== "object") fail();
    if (command.type === "transform") {
      const item = document.objects.find((object) => object.id === command.id);
      if (!item) fail();
      return [item.asset];
    }
    return [
      command.asset ||
        command.object?.asset ||
        command.rule?.asset ||
        command.floor?.asset,
    ].filter(Boolean);
  });
}
export function replay_component_proposal(plan, document, materials) {
  validate_component_proposal(plan, document);
  for (const command of plan.commands)
    if (command.type === "transform")
      require_component_material(
        document.objects.find((object) => object.id === command.id).asset,
        materials,
        "model",
      );
  const preview = plan.commands.length
    ? apply_component_commands(document, plan.commands, materials)
    : document;
  if (component_document_hash(preview) !== plan.preview.document_hash) fail();
  return preview;
}
export async function prepare_component_proposal(
  plan,
  document,
  resolve,
  signal,
) {
  const checked = validate_component_proposal(plan, document);
  const materials = await resolve(
    proposal_references(checked, document),
    signal,
  );
  signal.throwIfAborted();
  return {
    plan: checked,
    base_json: component_document_json(document),
    document: replay_component_proposal(checked, document, materials),
  };
}
