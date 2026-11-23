import { useState } from "react";

/** Rename drafts and requests belong to the selected item's details panel. */
export default function useInventoryRename({
  target,
  category,
  on_changed,
  disabled,
}) {
  const [editing, set_editing] = useState(false),
    [name, set_name] = useState("");
  const [revision, set_revision] = useState("");
  const [busy, set_busy] = useState(false),
    [error, set_error] = useState("");
  const endpoint = `${import.meta.env.BASE_URL}api/environment-catalog`;
  const begin = async () => {
    if (disabled || busy || editing) return;
    set_error("");
    set_name(
      target.kind === "folder" ? target.path.split("/").at(-1) : target.label,
    );
    set_editing(true);
    set_busy(true);
    try {
      if (target.kind === "model") {
        const response = await fetch(
          `${endpoint}/${encodeURIComponent(target.id)}`,
          {
            credentials: "include",
            cache: "no-store",
            signal: AbortSignal.timeout(15000),
          },
        );
        if (!response.ok) throw Error();
        const catalog = await response.json();
        set_name(catalog.record.name);
        set_revision(catalog.revision);
      }
    } catch {
      set_editing(false);
      set_error("tree_error");
    } finally {
      set_busy(false);
    }
  };
  const save = async (event) => {
    event.preventDefault();
    if (disabled || busy) return;
    set_busy(true);
    set_error("");
    try {
      const body =
        target.kind === "model"
          ? { action: "rename-model", id: target.id, revision, name }
          : {
              action: "rename-folder",
              category,
              folder_path: target.path,
              name,
            };
      const response = await fetch(`${endpoint}/manage`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      set_editing(false);
      await on_changed(result);
    } catch (error) {
      set_error(
        error.message === "invalid_record"
          ? "rename_invalid"
          : [
                "file_conflict",
                "folder_conflict",
                "folder_not_found",
                "invalid_folder",
              ].includes(error.message)
            ? error.message
            : "tree_error",
      );
    } finally {
      set_busy(false);
    }
  };
  return {
    editing,
    name,
    set_name,
    busy,
    error,
    begin,
    save,
    cancel: () => {
      set_editing(false);
      set_error("");
    },
  };
}
