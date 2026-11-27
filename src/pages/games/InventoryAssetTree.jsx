import { useMemo, useState } from "react";
import CoolTree from "../../utils/ui/CoolTree.jsx";
import AppText from "../../AppText.jsx";
import { INVENTORY_TEXT } from "../../text/GamesText.jsx";
import { build_inventory_asset_tree } from "./InventoryAssetTree.js";
import useInventoryFolders from "./useInventoryFolders.js";
import useInventoryNewFolder from "./useInventoryNewFolder.js";
import InventoryNewFolder from "./InventoryNewFolder.jsx";
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
  documents = [],
  on_document_open,
  selected_document = null,
}) {
  const organization = useInventoryFolders(category, assets, on_folders);
  // The tree creates root-level folders; subfolders are created from a folder's details panel.
  const creation = useInventoryNewFolder({
    parent: "",
    category,
    folders: organization.folders,
    on_created: organization.retry,
  });
  const text = (key) => AppText.get(INVENTORY_CATALOG_TEXT[key]);
  const tree = useMemo(
    () => build_inventory_asset_tree(assets, organization.folders, documents),
    [assets, organization.folders, documents],
  );
  const folder =
    selected_folder && tree.folder_keys.includes(`folder:${selected_folder}`)
      ? selected_folder
      : null;
  const [collapsed, set_collapsed] = useState([]);
  return (
    <>
      <InventoryNewFolder creation={creation} />
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
              : selected_document
                ? [`document:${selected_document}`]
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
            const document = items.find((item) => item.metadata?.document_id);
            // Authored components open in the construction stage.
            if (document) {
              on_folder_select(null);
              return on_document_open?.(document.metadata.document_id);
            }
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
