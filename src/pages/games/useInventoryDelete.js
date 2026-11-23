import { useState } from "react";

/** Opening confirmation never deletes; only a second, explicit submit mutates. */
export default function useInventoryDelete({
  target,
  category,
  on_changed,
  disabled,
}) {
  const [confirming, set_confirming] = useState(false),
    [revision, set_revision] = useState("");
  const [busy, set_busy] = useState(false),
    [error, set_error] = useState("");
  const endpoint = `${import.meta.env.BASE_URL}api/environment-catalog`;
  const begin = async () => {
    if (disabled || busy || confirming) return;
    set_error("");
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
        set_revision((await response.json()).revision);
      }
      set_confirming(true);
    } catch {
      set_error("tree_error");
    } finally {
      set_busy(false);
    }
  };
  const confirm = async (event) => {
    event.preventDefault();
    if (disabled || busy || !confirming) return;
    set_error("");
    set_busy(true);
    try {
      const body =
        target.kind === "model"
          ? { action: "delete-model", id: target.id, revision }
          : { action: "delete-folder", category, folder_path: target.path };
      const response = await fetch(`${endpoint}/manage`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      set_confirming(false);
      await on_changed(result);
    } catch (error) {
      set_error(
        [
          "folder_not_empty",
          "folder_conflict",
          "folder_not_found",
          "file_conflict",
          "invalid_record",
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
    confirming,
    busy,
    error,
    begin,
    confirm,
    cancel: () => {
      set_confirming(false);
      set_error("");
    },
  };
}
