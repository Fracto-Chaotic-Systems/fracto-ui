import InventorySelectionName from "./InventorySelectionName.jsx";
import {
  PreviewRange,
  PreviewAnimationToggle,
  PreviewScaleControls,
  PreviewLightingControls,
  PreviewFlameColor,
} from "./InventoryPreviewControls.jsx";
import MaterialMetadataPanel from "./MaterialMetadataPanel.jsx";
import { useEffect, useRef, useState } from "react";
import AppText from "../../AppText.jsx";
import InventoryCatalogPanel from "./InventoryCatalogPanel.jsx";
import InventoryImport from "./InventoryImport.jsx";
import InventoryAssetTree from "./InventoryAssetTree.jsx";
import useInventoryAssets from "./useInventoryAssets.js";
import {
  INVENTORY_TEXT,
  INVENTORY_CATALOG_TEXT,
} from "../../text/GamesText.jsx";
import {
  create_inventory_scene,
  DEFAULT_INVENTORY_PREVIEW,
} from "./InventoryScene.js";
import {
  InventoryLayout,
  InventoryToolbar,
  InventoryWorkspace,
  InventoryViewport,
  InventoryStatus,
  InventoryControls,
  InventoryCaption,
  InventoryPreviewPane,
  InventoryDetails,
  InventoryAssetList,
  InventoryContent,
} from "./InventoryStyles.jsx";

const text = (key) => AppText.get(INVENTORY_TEXT[key]);

function InventoryPreview({
  asset,
  options,
  reset,
  retry,
  on_status,
  on_info,
}) {
  const host = useRef(null),
    scene = useRef(null);
  useEffect(() => {
    try {
      scene.current = create_inventory_scene(host.current, {
        label: text("view"),
        asset,
        on_status,
        on_info,
      });
    } catch {
      on_status("error");
    }
    return () => {
      scene.current?.dispose();
      scene.current = null;
    };
  }, [asset, retry, on_status, on_info]);
  useEffect(() => {
    scene.current?.update(options);
  }, [asset, options, retry]);
  useEffect(() => {
    scene.current?.reset_camera();
  }, [reset]);
  return <InventoryViewport ref={host} />;
}

export default function GamesInventory({
  children,
  category,
  toolbar,
  empty_message,
  documents,
  documents_status,
  on_document_open,
  on_tree_changed,
  selected_document = null,
  selected_folder: folder_selection,
  on_folder_select,
  on_asset_select,
  content = null,
}) {
  const inventory = useInventoryAssets(category);
  const { asset } = inventory;
  const [folders, set_folders] = useState([]);
  const [catalog_editing, set_catalog_editing] = useState(false);
  const [material_editing, set_material_editing] = useState(false);
  const [catalog_refresh, set_catalog_refresh] = useState(0);
  // Kept here so the catalog tab survives panel remounts after saves.
  const [catalog_tab, set_catalog_tab] = useState(0);
  // Folder selection may be owned by the page (components) or kept here (materials).
  const [own_folder, set_own_folder] = useState(null);
  const folder_controlled = folder_selection !== undefined;
  const selected_folder = folder_controlled ? folder_selection : own_folder;
  const set_selected_folder = folder_controlled
    ? on_folder_select
    : set_own_folder;
  const target = selected_folder
    ? { kind: "folder", path: selected_folder, label: selected_folder }
    : asset
      ? {
          kind: "model",
          id: asset.id,
          label: asset.name,
          folder_path: asset.folder_path || "",
        }
      : null;
  const [options, set_options] = useState({ ...DEFAULT_INVENTORY_PREVIEW });
  const [status, set_status] = useState("loading");
  const [model_info, set_model_info] = useState(null);
  const [reset, set_reset] = useState(0),
    [retry, set_retry] = useState(0);
  const set_option = (key, value) =>
    set_options((current) => ({ ...current, [key]: value }));
  const range = (key, min, max, step, suffix) => (
    <PreviewRange
      label={text(key)}
      value={options[key]}
      min={min}
      max={max}
      step={step}
      suffix={suffix}
      on_change={(value) => set_option(key, value)}
    />
  );
  return (
    <InventoryLayout>
      {children}
      <InventoryToolbar>
        {toolbar ?? (
          <InventoryImport
            category={category}
            on_imported={async (id) => {
              set_selected_folder(null);
              await inventory.reload(id);
              set_status("loading");
              set_options({ ...DEFAULT_INVENTORY_PREVIEW });
            }}
          />
        )}
      </InventoryToolbar>
      <InventoryWorkspace>
        <InventoryAssetList aria-label={text("assets")}>
          {inventory.loading && <p role="status">{text("loading_assets")}</p>}
          {inventory.error && (
            <p role="alert">
              {text("assets_error")}{" "}
              <button onClick={() => inventory.reload()}>
                {text("retry")}
              </button>
            </p>
          )}
          {documents_status}
          <InventoryAssetTree
            category={category}
            documents={documents}
            on_document_open={on_document_open}
            on_folders={set_folders}
            selected_folder={selected_folder}
            on_folder_select={set_selected_folder}
            assets={inventory.assets}
            selected={content ? null : inventory.selected}
            selected_document={content ? selected_document : null}
            on_select={(id) => {
              on_asset_select?.(id);
              if (id === inventory.selected) return;
              inventory.select(id);
              set_status("loading");
              set_options({ ...DEFAULT_INVENTORY_PREVIEW });
            }}
          />
        </InventoryAssetList>
        {content ? (
          <InventoryContent>{content}</InventoryContent>
        ) : (
          <>
            {asset ? (
              <>
                <InventoryPreviewPane>
                  <InventoryPreview
                    asset={asset}
                    options={options}
                    reset={reset}
                    retry={retry}
                    on_status={set_status}
                    on_info={set_model_info}
                  />
                  {status !== "ready" && (
                    <InventoryStatus role="status">
                      {text(status)}{" "}
                      {["error", "model_error"].includes(status) && (
                        <button
                          onClick={() => {
                            set_status("loading");
                            set_retry((value) => value + 1);
                          }}
                        >
                          {text("retry")}
                        </button>
                      )}
                    </InventoryStatus>
                  )}
                  <InventoryDetails
                    tabIndex={0}
                    role="region"
                    aria-label={AppText.get(INVENTORY_CATALOG_TEXT.title)}
                  >
                    <InventoryCaption>
                      {text(options.reference ? "units" : "units_grid")}
                    </InventoryCaption>
                    <InventoryCatalogPanel
                      key={`${asset.id}:${asset.name}:${asset.folder_path}:${catalog_refresh}`}
                      asset_id={asset.id}
                      editing_disabled={material_editing}
                      on_editing_change={set_catalog_editing}
                      on_saved={() => inventory.reload(asset.id)}
                      tab={catalog_tab}
                      on_tab={set_catalog_tab}
                      metadata={
                        category === "material" && (
                          <MaterialMetadataPanel
                            key={asset.id}
                            asset_id={asset.id}
                            read_only
                            disabled={catalog_editing}
                            on_editing_change={set_material_editing}
                            on_saved={() =>
                              set_catalog_refresh((value) => value + 1)
                            }
                          />
                        )
                      }
                    />
                  </InventoryDetails>
                </InventoryPreviewPane>
              </>
            ) : (
              <InventoryCaption>
                {inventory.loading
                  ? text("loading_assets")
                  : inventory.error
                    ? text("assets_error")
                    : (empty_message ?? text("empty_assets"))}
              </InventoryCaption>
            )}
            {target && (
              <InventoryControls aria-label={text("asset")}>
                <InventorySelectionName
                  key={
                    selected_folder
                      ? `folder:${selected_folder}`
                      : `model:${asset.id}`
                  }
                  target={target}
                  category={category}
                  folders={folders}
                  disabled={catalog_editing || material_editing}
                  on_folder_created={async () => {
                    await inventory.reload();
                    await on_tree_changed?.();
                  }}
                  on_changed={async (result) => {
                    if (target.kind === "folder")
                      set_selected_folder(result.target || null);
                    await inventory.reload();
                    await on_tree_changed?.();
                  }}
                />
                {asset && !selected_folder && (
                  <>
                    {status === "ready" && model_info?.material_repairs > 0 && (
                      <InventoryCaption>
                        {text("material_repair")}
                      </InventoryCaption>
                    )}
                    {status === "ready" &&
                      (model_info?.animations > 0 || model_info?.effects > 0) && (
                      <PreviewAnimationToggle
                        checked={options.animation}
                        on_change={(value) => set_option("animation", value)}
                      />
                    )}
                    {status === "ready" && model_info?.effects > 0 && (
                      <>
                        <PreviewFlameColor
                          value={options.flame_cardinality}
                          on_change={(value) =>
                            set_option("flame_cardinality", value)
                          }
                        />
                        <InventoryCaption>{text("flame_help")}</InventoryCaption>
                      </>
                    )}
                    <PreviewScaleControls
                      scale={options.scale}
                      height={model_info?.height ?? null}
                      on_change={(value) => set_option("scale", value)}
                    />
                    {asset.id === "grasses-2" && (
                      <>
                        {range("density", 0, 8, 0.25, "×")}
                        <InventoryCaption>
                          {text("density_help")}
                        </InventoryCaption>
                      </>
                    )}
                    <PreviewLightingControls
                      direction={options.lighting}
                      intensity={options.strength}
                      on_change={(field, value) =>
                        set_option(
                          field === "direction" ? "lighting" : "strength",
                          value,
                        )
                      }
                    />
                    {["normal", "roughness", "wireframe", "reference"].map(
                      (key) => (
                        <label key={key}>
                          <input
                            type="checkbox"
                            checked={options[key]}
                            onChange={(event) =>
                              set_option(key, event.target.checked)
                            }
                          />
                          {text(key)}
                        </label>
                      ),
                    )}
                    <button
                      onClick={() => {
                        set_options({ ...DEFAULT_INVENTORY_PREVIEW });
                        set_reset((value) => value + 1);
                      }}
                    >
                      {text("reset")}
                    </button>
                    <InventoryCaption>
                      {status === "ready" && model_info
                        ? text("ready")
                            .replace("{triangles}", model_info.triangles)
                            .replace("{materials}", model_info.materials)
                            .replace("{textures}", model_info.textures)
                        : text(status)}
                    </InventoryCaption>
                  </>
                )}
              </InventoryControls>
            )}
          </>
        )}
      </InventoryWorkspace>
      <InventoryCaption>{text("note")}</InventoryCaption>
    </InventoryLayout>
  );
}
