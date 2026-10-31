// Remove only obsolete note caches. No current notes are read from storage.
export function discard_legacy_note_cache(storage) {
  try {
    storage.removeItem("games/world_notes");
    storage.removeItem("games/world_name_notes_version");
  } catch {
    /* A blocked storage API must not prevent database reads. */
  }
}

export async function save_world_note(cardinality, notes, expected, request) {
  const response = await request(cardinality, notes, expected);
  if (
    Number(response?.result?.cardinality) !== cardinality ||
    response?.result?.notes !== notes
  )
    throw Error("Invalid saved notes response");
  return response.result;
}
