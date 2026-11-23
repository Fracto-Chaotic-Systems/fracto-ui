import { useEffect, useState } from "react";
import {
  ATTRIBUTION_FIELDS,
  CATALOG_DRAFT_PREFIX,
  read_catalog_draft,
} from "./InventoryCatalog.js";

const endpoint = (id) =>
  `${import.meta.env.BASE_URL}api/environment-catalog/${encodeURIComponent(id)}`;
async function request(id, options = {}) {
  const response = await fetch(endpoint(id), {
    credentials: "include",
    cache: "no-store",
    ...options,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "save_error");
  return result;
}

export default function useInventoryCatalog(asset_id, on_saved) {
  const [folder_path, set_folder_path] = useState("");
  const [catalog, set_catalog] = useState(null),
    [reload_count, set_reload_count] = useState(0);
  const [editing, set_editing] = useState(false),
    [fields, set_fields] = useState({});
  const [note, set_note] = useState(""),
    [message, set_message] = useState("");
  const [busy, set_busy] = useState(true),
    [load_error, set_load_error] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    request(asset_id, { signal: controller.signal })
      .then((next) => {
        set_catalog(next);
        set_folder_path(next.record.folder_path || "");
        set_load_error(false);
        set_busy(false);
        if (reload_count === 0) {
          try {
            const draft = read_catalog_draft(next.record, window.localStorage);
            const changed = ATTRIBUTION_FIELDS.some(
              (key) =>
                (draft.attribution[key] || "") !==
                (next.record.attribution[key] || ""),
            );
            const extra_notes = draft.history
              .slice(next.record.history.length)
              .filter((entry) => entry.action === "catalog-note")
              .map((entry) => entry.description)
              .join("\n");
            if (changed || extra_notes) {
              set_fields(
                Object.fromEntries(
                  ATTRIBUTION_FIELDS.map((key) => [
                    key,
                    draft.attribution[key] || "",
                  ]),
                ),
              );
              set_note(extra_notes);
              set_editing(true);
              set_message("recovered");
            }
          } catch {
            /* Legacy drafts cannot replace the authoritative file. */
          }
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          set_load_error(true);
          set_busy(false);
        }
      });
    return () => controller.abort();
  }, [asset_id, reload_count]);
  const edit = () => {
    set_folder_path(catalog.record.folder_path || "");
    set_fields(
      Object.fromEntries(
        ATTRIBUTION_FIELDS.map((key) => [
          key,
          catalog.record.attribution[key] || "",
        ]),
      ),
    );
    set_note("");
    set_editing(true);
    set_message("");
  };
  const reload = () => {
    set_editing(false);
    set_message("");
    set_busy(true);
    set_reload_count((value) => value + 1);
  };
  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    set_busy(true);
    set_message("saving");
    try {
      const next = await request(asset_id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: catalog.revision,
          attribution: fields,
          note,
          folder_path,
        }),
      });
      set_catalog(next);
      set_editing(false);
      set_message("saved_direct");
      await on_saved?.(next.record);
      try {
        window.localStorage.removeItem(CATALOG_DRAFT_PREFIX + asset_id);
      } catch {
        /* Disk save succeeded. */
      }
    } catch (error) {
      set_message(
        [
          "file_conflict",
          "invalid_url",
          "invalid_record",
          "invalid_folder",
        ].includes(error.message)
          ? error.message
          : "save_error",
      );
    } finally {
      set_busy(false);
    }
  };
  return {
    record: catalog?.record,
    busy,
    load_error,
    editing,
    fields,
    set_fields,
    folder_path,
    set_folder_path,
    note,
    set_note,
    message,
    edit,
    reload,
    save,
    cancel: () => {
      set_editing(false);
      set_message("");
    },
  };
}
