import { useState } from "react";
import CoolIconLink from "../../utils/ui/CoolIconLink.jsx";
import CoolEditLink from "../../utils/ui/CoolEditLink.jsx";
import { check_icon, cancel_icon } from "../../utils/ui/CoolIcons.jsx";
import AppText from "../../AppText.jsx";
import {
  INVENTORY_CATALOG_TEXT,
  COMPONENT_STAGE_TEXT,
} from "../../text/GamesText.jsx";
import { CatalogMoveForm } from "./InventoryCatalogStyles.jsx";
import { InventoryFolderLine, InventoryNameRow } from "./InventoryStyles.jsx";
import useInventoryFolders from "./useInventoryFolders.js";
import { component_request } from "./ComponentDocumentApi.js";

const text = (key) => AppText.get(INVENTORY_CATALOG_TEXT[key]);
const NO_ASSETS = [];

/** "in: <folder>" for a saved component, with the pencil to move it (saved at once). */
export default function ComponentFolderMove({
  id,
  folder_path = "",
  disabled = false,
  on_moved,
}) {
  const organization = useInventoryFolders("component", NO_ASSETS);
  const [moving, set_moving] = useState(false);
  const [target, set_target] = useState(folder_path);
  const [busy, set_busy] = useState(false);
  const [failed, set_failed] = useState(false);
  const cancel = () => {
    set_moving(false);
    set_failed(false);
  };
  const save = async (event) => {
    event.preventDefault();
    if (disabled || busy) return;
    if (target === folder_path) return cancel();
    set_busy(true);
    set_failed(false);
    try {
      await component_request(`/${encodeURIComponent(id)}/folder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_path: target }),
      });
      set_moving(false);
      await on_moved?.(target);
    } catch {
      set_failed(true);
    } finally {
      set_busy(false);
    }
  };
  if (!moving)
    return (
      <InventoryFolderLine>
        <InventoryNameRow>
          <span>
            {text("in_folder")}{" "}
            <strong>{folder_path || text("folder_root")}</strong>
          </span>
          <CoolEditLink
            title={text("move_folder")}
            disabled={disabled}
            on_click={() => {
              if (disabled) return;
              set_target(folder_path);
              set_failed(false);
              set_moving(true);
            }}
          />
        </InventoryNameRow>
      </InventoryFolderLine>
    );
  return (
    <InventoryFolderLine>
      <CatalogMoveForm
        onSubmit={save}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !busy) {
            event.preventDefault();
            cancel();
          }
        }}
      >
        <label>
          {text("in_folder")}
          <select
            value={target}
            disabled={disabled || busy}
            onChange={(event) => set_target(event.target.value)}
          >
            <option value="">{text("folder_root")}</option>
            {[
              ...new Set(
                [...organization.folders, folder_path].filter(Boolean),
              ),
            ]
              .sort()
              .map((path) => (
                <option key={path} value={path}>
                  {path}
                </option>
              ))}
          </select>
        </label>
        <CoolIconLink
          title={text("move_folder")}
          icon={check_icon}
          color="#17803d"
          type="submit"
          disabled={disabled || busy}
        />
        <CoolIconLink
          title={text("cancel")}
          icon={cancel_icon}
          color="#c62828"
          on_click={cancel}
          disabled={busy}
        />
      </CatalogMoveForm>
      {(failed || organization.error) && (
        <p role="alert">{AppText.get(COMPONENT_STAGE_TEXT.request_error)}</p>
      )}
    </InventoryFolderLine>
  );
}
