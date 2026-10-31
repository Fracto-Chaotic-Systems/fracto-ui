import { WORLDS_GAP_FILL, WORLDS_GAP_VERSION } from "./WorldsGapFill.js";
import { normalize_world_mapping } from "./WorldsMapping.js";
import {
  WORLDS_DRAFT_VERSION,
  WORLDS_FIRST_ROUND,
} from "./WorldsFirstRound.js";

// Apply each editorial expansion once. Existing placements and notes win
// conflicts; upgrading a first-round draft never replays its original seeds.
export function prepare_worlds_draft(
  saved_mapping,
  saved_notes,
  saved_version,
  contenders,
) {
  const mapping = normalize_world_mapping(saved_mapping, contenders);
  const notes = Object.fromEntries(
    Object.entries(
      saved_notes &&
        typeof saved_notes === "object" &&
        !Array.isArray(saved_notes)
        ? saved_notes
        : {},
    ).filter(
      ([row, note]) =>
        /^[1-9]\d*$/.test(row) &&
        Number.isSafeInteger(Number(row)) &&
        typeof note === "string",
    ),
  );
  if (saved_version !== WORLDS_GAP_VERSION) {
    const additions =
      saved_version === WORLDS_DRAFT_VERSION
        ? WORLDS_GAP_FILL
        : [...WORLDS_FIRST_ROUND, ...WORLDS_GAP_FILL];
    const assigned = new Set(Object.values(mapping));
    const allowed = new Set(contenders.map((item) => item.id));
    for (const entry of additions) {
      const { cardinality, synset_id, note } = entry;
      if (!allowed.has(synset_id)) continue;
      if (!mapping[cardinality] && !assigned.has(synset_id)) {
        mapping[cardinality] = synset_id;
        assigned.add(synset_id);
      }
      if (mapping[cardinality] === synset_id && !(cardinality in notes)) {
        notes[cardinality] = note;
      }
    }
  }
  return { mapping, notes, version: WORLDS_GAP_VERSION };
}
