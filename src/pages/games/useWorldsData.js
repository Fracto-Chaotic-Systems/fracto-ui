import { useEffect, useRef, useState } from "react";
import { DataBackend } from "../../backend/DataBackend.jsx";
import { index_world_mappings } from "./WorldsDatabase.js";
import {
  discard_legacy_note_cache,
  save_world_note,
} from "./WorldsNotesData.js";

export default function useWorldsData() {
  const [data, set_data] = useState({
    mapping: {},
    associations: {},
    notes: {},
  });
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState(false);
  const [attempt, set_attempt] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    try {
      discard_legacy_note_cache(window.localStorage);
    } catch {
      /* Storage access can itself be blocked. */
    }
    const controller = new AbortController();
    let in_flight = false;
    const load = async () => {
      if (in_flight) return;
      in_flight = true;
      const current = ++generation.current;
      try {
        const response = await DataBackend.get_wordnet_mappings(
          controller.signal,
        );
        const next = index_world_mappings(response.result);
        if (!controller.signal.aborted && current === generation.current) {
          set_data(next);
          set_error(false);
        }
      } catch {
        if (!controller.signal.aborted && current === generation.current)
          set_error(true);
      } finally {
        if (!controller.signal.aborted) set_loading(false);
        in_flight = false;
      }
    };
    const visible = () => {
      if (document.visibilityState === "visible") load();
    };
    load();
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", visible);
    return () => {
      controller.abort();
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [attempt]);
  const save_note = async (cardinality, notes, expected) => {
    ++generation.current;
    const row = await save_world_note(
      cardinality,
      notes,
      expected,
      DataBackend.save_world_notes,
    );
    const next = index_world_mappings([row]);
    ++generation.current;
    set_data((previous) => ({
      mapping: { ...previous.mapping, ...next.mapping },
      associations: { ...previous.associations, ...next.associations },
      notes: { ...previous.notes, ...next.notes },
    }));
  };
  return {
    data,
    loading,
    error,
    save_note,
    reload: () => {
      set_loading(true);
      set_attempt((value) => value + 1);
    },
  };
}
