import { useEffect, useRef } from "react";
import CoolIconLink from "../../utils/ui/CoolIconLink.jsx";
import {
  trash_icon,
  check_icon,
  cancel_icon,
} from "../../utils/ui/CoolIcons.jsx";
import useInventoryDelete from "./useInventoryDelete.js";
import AppText from "../../AppText.jsx";
import CoolEditLink from "../../utils/ui/CoolEditLink.jsx";
import { INVENTORY_CATALOG_TEXT } from "../../text/GamesText.jsx";
import {
  InventoryFolderLine,
  InventoryNameRow,
  TreeActions,
  TreeActionForm,
} from "./InventoryStyles.jsx";
import useInventoryRename from "./useInventoryRename.js";
import useInventoryNewFolder from "./useInventoryNewFolder.js";
import InventoryNewFolder from "./InventoryNewFolder.jsx";
import useInventoryMove, { parent_folder } from "./useInventoryMove.js";
import { folder_contains } from "@fracto/sdk/FractoModelManagement.js";
import { CatalogMoveForm } from "./InventoryCatalogStyles.jsx";

const text = (key) => AppText.get(INVENTORY_CATALOG_TEXT[key]);
export default function InventorySelectionName({
  target,
  category,
  on_changed,
  on_folder_created,
  folders = [],
  disabled = false,
}) {
  const creation = useInventoryNewFolder({
    parent: target.kind === "folder" ? target.path : "",
    category,
    folders,
    on_created: on_folder_created,
    disabled,
  });
  const creating = creation.editing || creation.busy;
  const move = useInventoryMove({
    target,
    category,
    on_changed,
    disabled: disabled || creating,
  });
  const moving = move.moving || move.busy;
  const rename = useInventoryRename({
    target,
    category,
    on_changed,
    disabled: disabled || creating || moving,
  });
  const deletion = useInventoryDelete({
    target,
    category,
    on_changed,
    disabled: disabled || creating || moving || rename.busy || rename.editing,
  });
  const name_input = useRef(null);
  useEffect(() => {
    if (rename.editing && !rename.busy && !disabled) {
      name_input.current?.focus();
      name_input.current?.select();
    }
  }, [rename.editing, rename.busy, disabled]);
  return (
    <>
      {rename.editing ? (
        <InventoryNameRow as="form" onSubmit={rename.save}>
          <input
            ref={name_input}
            required
            aria-label={text("new_name")}
            maxLength={target.kind === "folder" ? 64 : 255}
            value={rename.name}
            disabled={disabled || rename.busy}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => rename.set_name(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !rename.busy) {
                event.preventDefault();
                rename.cancel();
              }
            }}
          />
          <CoolIconLink
            title={text("accept_rename")}
            icon={check_icon}
            color="#17803d"
            type="submit"
            disabled={disabled || rename.busy}
          />
          <CoolIconLink
            title={text("cancel")}
            icon={cancel_icon}
            color="#c62828"
            on_click={rename.cancel}
            disabled={rename.busy}
          />
        </InventoryNameRow>
      ) : (
        <InventoryNameRow>
          <strong>
            {target.kind === "folder"
              ? target.path.split("/").at(-1)
              : target.label}
          </strong>
          <CoolEditLink
            title={text("rename")}
            disabled={
              disabled ||
              creating ||
              moving ||
              rename.busy ||
              rename.editing ||
              deletion.busy ||
              deletion.confirming
            }
            on_click={() => {
              if (!deletion.busy && !deletion.confirming) return rename.begin();
            }}
          />
          <CoolIconLink
            title={text("delete")}
            icon={trash_icon}
            color="#8b1e1e"
            className="inventory-delete-action"
            on_click={deletion.begin}
            disabled={
              disabled ||
              creating ||
              moving ||
              rename.busy ||
              rename.editing ||
              deletion.busy ||
              deletion.confirming
            }
          />
        </InventoryNameRow>
      )}
      <InventoryFolderLine>
        {move.moving ? (
          <CatalogMoveForm
            onSubmit={move.save}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !move.busy) {
                event.preventDefault();
                move.cancel();
              }
            }}
          >
            <label>
              {text("in_folder")}
              <select
                value={move.folder}
                disabled={disabled || move.busy}
                onChange={(event) => move.set_folder(event.target.value)}
              >
                <option value="">{text("folder_root")}</option>
                {[...new Set([...folders, move.current].filter(Boolean))]
                  // A folder cannot move into itself or one of its subfolders.
                  .filter(
                    (path) =>
                      target.kind !== "folder" ||
                      !folder_contains(target.path, path),
                  )
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
              disabled={disabled || move.busy}
            />
            <CoolIconLink
              title={text("cancel")}
              icon={cancel_icon}
              color="#c62828"
              on_click={move.cancel}
              disabled={move.busy}
            />
          </CatalogMoveForm>
        ) : (
          <InventoryNameRow>
            <span>
              {text("in_folder")}{" "}
              <strong>
                {(target.kind === "folder"
                  ? parent_folder(target.path)
                  : target.folder_path) || text("folder_root")}
              </strong>
            </span>
            <CoolEditLink
              title={text("move_folder")}
              disabled={
                disabled ||
                creating ||
                move.busy ||
                rename.busy ||
                rename.editing ||
                deletion.busy ||
                deletion.confirming
              }
              on_click={move.begin}
            />
          </InventoryNameRow>
        )}
      </InventoryFolderLine>
      {target.kind === "folder" && (
        <InventoryNewFolder
          creation={creation}
          disabled={disabled}
          button_disabled={
            rename.busy ||
            rename.editing ||
            deletion.busy ||
            deletion.confirming
          }
        />
      )}
      {deletion.confirming && (
        <TreeActionForm onSubmit={deletion.confirm}>
          <strong>{target.label}</strong>
          <p>
            {text(
              target.kind === "folder"
                ? "delete_folder_help"
                : "delete_model_help",
            )}
          </p>
          <TreeActions>
            <button disabled={disabled || deletion.busy}>
              {text("confirm_delete")}
            </button>
            <button
              type="button"
              disabled={deletion.busy}
              onClick={deletion.cancel}
            >
              {text("cancel")}
            </button>
          </TreeActions>
        </TreeActionForm>
      )}
      {deletion.error && <p role="alert">{text(deletion.error)}</p>}
      {rename.error && <p role="alert">{text(rename.error)}</p>}
      {move.error && <p role="alert">{text(move.error)}</p>}
    </>
  );
}
