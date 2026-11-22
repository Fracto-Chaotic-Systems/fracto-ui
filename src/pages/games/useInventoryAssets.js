import { useEffect, useState } from "react";
export default function useInventoryAssets() {
  const [assets, set_assets] = useState([]),
    [selected, set_selected] = useState(null);
  const [loading, set_loading] = useState(true),
    [error, set_error] = useState(false);
  const reload = async (preferred) => {
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}api/environment-catalog`,
        { credentials: "include", cache: "no-store" },
      );
      if (!response.ok) throw new Error("catalog_unavailable");
      const data = await response.json();
      set_error(false);
      set_assets(data.assets);
      set_selected(
        (current) =>
          data.assets.find((item) => item.id === (preferred || current))?.id ||
          data.assets[0]?.id ||
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
    fetch(`${import.meta.env.BASE_URL}api/environment-catalog`, {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("catalog_unavailable");
        const data = await response.json();
        set_assets(data.assets);
        set_selected(data.assets[0]?.id || null);
      })
      .catch((error) => {
        if (error.name !== "AbortError") set_error(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) set_loading(false);
      });
    return () => controller.abort();
  }, []);
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
