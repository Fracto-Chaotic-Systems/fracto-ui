// Database mappings do not depend on the provisional contender tray.
export function index_world_mappings(rows) {
  if (!Array.isArray(rows)) throw Error("Invalid mappings response");
  const mapping = {},
    associations = {},
    notes = {};
  const seen = new Set();
  for (const row of rows) {
    const cardinality = Number(row.cardinality);
    if (
      !Number.isSafeInteger(cardinality) ||
      cardinality < 1 ||
      mapping[cardinality] ||
      !/^\d{8}$/.test(row.synset_id) ||
      seen.has(row.synset_id) ||
      [row.word, row.world_name, row.definition, row.gloss, row.notes].some(
        (value) => typeof value !== "string",
      )
    )
      throw Error("Invalid mapping row");
    seen.add(row.synset_id);
    mapping[cardinality] = row.synset_id;
    notes[cardinality] = row.notes;
    associations[cardinality] = {
      id: row.synset_id,
      label: row.word,
      world_name: row.world_name,
      definition: row.definition,
      gloss: row.gloss,
    };
  }
  return { mapping, associations, notes };
}
