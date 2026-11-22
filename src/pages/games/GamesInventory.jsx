import { useEffect, useRef, useState } from "react";
import AppText from "../../AppText.jsx";
import InventoryCatalogPanel from "./InventoryCatalogPanel.jsx";
import InventoryImport from "./InventoryImport.jsx";
import useInventoryAssets from "./useInventoryAssets.js";
import { INVENTORY_TEXT } from "../../text/GamesText.jsx";
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
  InventoryAssetList,
  InventoryAssetButton,
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

export default function GamesInventory({ children, category }) {
  const inventory = useInventoryAssets(category);
  const { asset } = inventory;
  const [options, set_options] = useState({ ...DEFAULT_INVENTORY_PREVIEW });
  const [status, set_status] = useState("loading");
  const [model_info, set_model_info] = useState(null);
  const [reset, set_reset] = useState(0),
    [retry, set_retry] = useState(0);
  const set_option = (key, value) =>
    set_options((current) => ({ ...current, [key]: value }));
  const range = (key, min, max, step, suffix) => (
    <label>
      {text(key)}{" "}
      <output>
        {options[key]}
        {suffix}
      </output>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={options[key]}
        aria-label={text(key)}
        onChange={(event) => set_option(key, Number(event.target.value))}
      />
    </label>
  );
  return (
    <InventoryLayout>
      {children}
      <InventoryToolbar>
        <InventoryImport
          category={category}
          on_imported={async (id) => {
            await inventory.reload(id);
            set_status("loading");
            set_options({ ...DEFAULT_INVENTORY_PREVIEW });
          }}
        />
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
          <ul>
            {inventory.assets.map((item) => (
              <li key={item.id}>
                <InventoryAssetButton
                  type="button"
                  aria-pressed={item.id === inventory.selected}
                  onClick={() => {
                    if (item.id === inventory.selected) return;
                    inventory.select(item.id);
                    set_status("loading");
                    set_options({ ...DEFAULT_INVENTORY_PREVIEW });
                  }}
                >
                  {item.name}
                </InventoryAssetButton>
              </li>
            ))}
          </ul>
        </InventoryAssetList>
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
                  {status === "error" && (
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
              <InventoryCaption>{text("units")}</InventoryCaption>
              <InventoryCaption>{text("help")}</InventoryCaption>
              <InventoryCatalogPanel key={asset.id} asset_id={asset.id} />
            </InventoryPreviewPane>
            <InventoryControls aria-label={text("asset")}>
              <strong>{asset.name}</strong>
              {status === "ready" && model_info?.material_repairs > 0 && (
                <InventoryCaption>{text("material_repair")}</InventoryCaption>
              )}
              {range("scale", 0.1, 2, 0.05, "×")}
              {asset.id === "grasses-2" && (
                <>
                  {range("density", 0, 8, 0.25, "×")}
                  <InventoryCaption>{text("density_help")}</InventoryCaption>
                </>
              )}
              <div>
                {text("height")}:{" "}
                <output>
                  {model_info
                    ? (model_info.height * options.scale).toFixed(2)
                    : "—"}{" "}
                  m
                </output>
              </div>
              {range("lighting", 0, 360, 5, "°")}
              {range("strength", 0.25, 6, 0.25, "")}
              {["normal", "roughness", "wireframe", "reference"].map((key) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={options[key]}
                    onChange={(event) => set_option(key, event.target.checked)}
                  />
                  {text(key)}
                </label>
              ))}
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
            </InventoryControls>
          </>
        ) : (
          <InventoryCaption>
            {inventory.loading
              ? text("loading_assets")
              : inventory.error
                ? text("assets_error")
                : text("empty_assets")}
          </InventoryCaption>
        )}
      </InventoryWorkspace>
      <InventoryCaption>{text("note")}</InventoryCaption>
    </InventoryLayout>
  );
}
