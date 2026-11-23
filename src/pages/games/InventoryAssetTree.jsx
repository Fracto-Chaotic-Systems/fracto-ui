import { useMemo, useState } from "react";
import CoolTree from "../../utils/ui/CoolTree.jsx";
import AppText from "../../AppText.jsx";
import { INVENTORY_TEXT } from "../../text/GamesText.jsx";
import { build_inventory_asset_tree } from "./InventoryAssetTree.js";
import useInventoryFolders from "./useInventoryFolders.js";
import { INVENTORY_CATALOG_TEXT } from "../../text/GamesText.jsx";
import { InventoryTreeHost } from "./InventoryStyles.jsx";

export default function InventoryAssetTree({
  assets,
  selected,
  on_select,
  category,
  on_folders,
  selected_folder,
  on_folder_select,
}) {
  const organization = useInventoryFolders(category, assets, on_folders);
  const [creating, set_creating] = useState(false),
    [path, set_path] = useState("");
  const text = (key) => AppText.get(INVENTORY_CATALOG_TEXT[key]);
  const tree = useMemo(
    () => build_inventory_asset_tree(assets, organization.folders),
    [assets, organization.folders],
  );
  const folder =
    selected_folder && tree.folder_keys.includes(`folder:${selected_folder}`)
      ? selected_folder
      : null;
  const [collapsed, set_collapsed] = useState([]);
  return (
    <>
      <button
        type="button"
        disabled={organization.busy}
        onClick={() => set_creating(true)}
      >
        {text("new_folder")}
      </button>
      {creating && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (await organization.create(path)) {
              set_creating(false);
              set_path("");
            }
          }}
        >
          <label>
            {text("folder_path")}
            <input
              required
              maxLength={512}
              value={path}
              onChange={(event) => set_path(event.target.value)}
              disabled={organization.busy}
            />
          </label>
          <small>{text("folder_help")}</small>
          <button disabled={organization.busy}>{text("new_folder")}</button>
          <button
            type="button"
            disabled={organization.busy}
            onClick={() => set_creating(false)}
          >
            {text("cancel")}
          </button>
        </form>
      )}
      {organization.error && (
        <p role="alert">
          {text("folder_error")}{" "}
          <button type="button" onClick={organization.retry}>
            {AppText.get(INVENTORY_TEXT.retry)}
          </button>
        </p>
      )}
      <InventoryTreeHost>
        <CoolTree
          tree_data={tree.nodes}
          hide_single_root={false}
          tree_label={AppText.get(INVENTORY_TEXT.assets)}
          selected_keys={
            folder
              ? [`folder:${folder}`]
              : selected
                ? [`asset:${selected}`]
                : []
          }
          expanded_keys={tree.folder_keys.filter(
            (key) => !collapsed.includes(key),
          )}
          on_expand={(expanded) =>
            set_collapsed(
              tree.folder_keys.filter((key) => !expanded.includes(key)),
            )
          }
          on_select={(keys, { items }) => {
            on_folder_select(
              keys[0]?.startsWith("folder:") ? keys[0].slice(7) : null,
            );
            const asset = items.find((item) => item.isLeaf);
            if (asset) on_select(asset.metadata.asset_id);
          }}
          show_live_description={false}
          root_leaf_margin_left_px={0}
        />
      </InventoryTreeHost>
    </>
  );
}
