import {
  EMPTY_CONSTRUCTION_MEMORY,
  validate_construction_memory,
  edit_construction_memory,
  delete_construction_pattern,
} from "@fracto/sdk/FractoConstructionMemory.js";

// AppSettings owns persistence. Revision checks prevent a stale form from
// replacing edits made elsewhere in the same application session.
export function create_component_memory_store(settings, key) {
  const read = () => validate_construction_memory(settings.get(key));
  const commit = (value) => {
    const checked = validate_construction_memory(value),
      previous = settings.get(key);
    try {
      settings.on_settings_changed({ [key]: checked });
    } catch {
      // AppSettings notifies before writing. Restore its runtime value if local
      // storage fails; localStorage writes are atomic for this single key.
      try {
        settings.on_settings_changed({ [key]: previous });
      } catch {
        /* state restored before persistence */
      }
      throw new Error("memory_storage_error");
    }
    return checked;
  };
  return {
    read,
    save: (pattern, revision) =>
      commit(edit_construction_memory(read(), pattern, revision)),
    remove: (id, revision) =>
      commit(delete_construction_pattern(read(), id, revision)),
    reset: () => commit(EMPTY_CONSTRUCTION_MEMORY),
  };
}
