import { useState } from "react";
import {
  create_inventory_folder,
  inventory_child_folder,
  normalize_inventory_folder_name,
} from "./InventoryFolderApi.js";

/** New-folder draft for the selected folder in the details panel (one name, no nesting). */
export default function useInventoryNewFolder({
  parent,
  category,
  folders = [],
  on_created,
  disabled,
}) {
  const [editing, set_editing] = useState(false),
    [name, set_name] = useState("");
  const [busy, set_busy] = useState(false),
    [error, set_error] = useState("");
  const begin = () => {
    if (disabled || busy || editing) return;
    set_error("");
    set_name("");
    set_editing(true);
  };
  const save = async (event) => {
    event.preventDefault();
    if (disabled || busy) return;
    const folder_name = normalize_inventory_folder_name(name);
    if (!folder_name) return set_error("folder_name_invalid");
    const folder_path = inventory_child_folder(parent, folder_name);
    if (folders.includes(folder_path)) return set_error("folder_exists");
    set_busy(true);
    set_error("");
    try {
      const result = await create_inventory_folder({ category, folder_path });
      set_editing(false);
      set_name("");
      await on_created?.(result.folder_path || folder_path);
    } catch (error) {
      set_error(
        ["folder_conflict", "folder_not_found", "invalid_folder"].includes(
          error.message,
        )
          ? error.message
          : "folder_error",
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
