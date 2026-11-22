import { useEffect, useState } from "react";
import { fetch_inventory_assets } from "./InventoryAssetRequest.js";
export default function useInventoryAssets(category) {
  const catalog_url = `${import.meta.env.BASE_URL}api/environment-catalog?category=${encodeURIComponent(category)}`;
  const [assets, set_assets] = useState([]),
    [selected, set_selected] = useState(null);
  const [loading, set_loading] = useState(true),
    [error, set_error] = useState(false);
  const reload = async (preferred) => {
    try {
      const loaded_assets = await fetch_inventory_assets(catalog_url);
      set_error(false);
      set_assets(loaded_assets);
      set_selected(
        (current) =>
          loaded_assets.find((item) => item.id === (preferred || current))
            ?.id ||
          loaded_assets[0]?.id ||
          null,
      );
    } catch {
      set_error(true);
    } finally {
      set_loading(false);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    fetch_inventory_assets(catalog_url, { signal: controller.signal })
      .then((loaded_assets) => {
        set_assets(loaded_assets);
        set_selected(loaded_assets[0]?.id || null);
      })
      .catch((error) => {
        if (error.name !== "AbortError") set_error(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) set_loading(false);
      });
    return () => controller.abort();
  }, [catalog_url]);
  return {
    assets,
    selected,
    select: set_selected,
    asset: assets.find((item) => item.id === selected),
    loading,
    error,
    reload,
  };
}
