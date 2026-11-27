import { useState } from "react";
import { ATTRIBUTION_FIELDS } from "./InventoryCatalog.js";

/**
 * Move the selected model or folder in the details panel. A model move is a
 * revision-checked catalog save that keeps the attribution and changes only
 * folder_path; a folder move keeps the folder's name under a new parent.
 */
export const parent_folder = (path) => path.split("/").slice(0, -1).join("/");
export default function useInventoryMove({
  target,
  category,
  on_changed,
  disabled,
}) {
  const [moving, set_moving] = useState(false),
    [folder, set_folder] = useState("");
  const [catalog, set_catalog] = useState(null);
  const [busy, set_busy] = useState(false),
    [error, set_error] = useState("");
  const folder_target = target.kind === "folder";
  const base = `${import.meta.env.BASE_URL}api/environment-catalog`;
  const endpoint = `${base}/${encodeURIComponent(target.id)}`;
  const begin = async () => {
    if (disabled || busy || moving) return;
    set_error("");
    if (folder_target) {
      set_folder(parent_folder(target.path));
      set_moving(true);
      return;
    }
    set_moving(true);
    set_busy(true);
    try {
      const response = await fetch(endpoint, {
        credentials: "include",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw Error();
      const next = await response.json();
      set_catalog(next);
      set_folder(next.record.folder_path || "");
    } catch {
      set_moving(false);
      set_error("tree_error");
    } finally {
      set_busy(false);
    }
  };
  const cancel = () => {
    set_moving(false);
    set_error("");
  };
  const current = folder_target
    ? parent_folder(target.path)
    : catalog?.record.folder_path || "";
  const save_folder = async () => {
    set_busy(true);
    set_error("");
    try {
      const response = await fetch(`${base}/manage`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move-folder",
          category,
          folder_path: target.path,
          parent: folder,
        }),
        signal: AbortSignal.timeout(60000),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      set_moving(false);
      await on_changed(result);
    } catch (error) {
      set_error(
        [
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
  const save = async (event) => {
    event.preventDefault();
    if (disabled || busy) return;
    if (folder === current) return cancel();
    if (folder_target) return save_folder();
    if (!catalog) return;
    set_busy(true);
    set_error("");
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: catalog.revision,
          attribution: Object.fromEntries(
            ATTRIBUTION_FIELDS.map((key) => [
              key,
              catalog.record.attribution[key] || "",
            ]),
          ),
          note: "",
          folder_path: folder,
        }),
        signal: AbortSignal.timeout(60000),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      set_moving(false);
      await on_changed({ id: target.id, folder_path: folder });
    } catch (error) {
      set_error(
        ["file_conflict", "invalid_folder"].includes(error.message)
          ? error.message
          : "tree_error",
      );
    } finally {
      set_busy(false);
    }
  };
  return {
    moving,
    folder,
    set_folder,
    current,
    busy,
    error,
    begin,
    save,
    cancel,
  };
}
