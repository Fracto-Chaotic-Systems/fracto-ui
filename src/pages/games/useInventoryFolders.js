import { useEffect, useState } from "react";
export default function useInventoryFolders(category, assets, on_folders) {
  const [folders, set_folders] = useState([]),
    [error, set_error] = useState(false);
  const [attempt, set_attempt] = useState(0);
  const url = `${import.meta.env.BASE_URL}api/environment-catalog/folders?category=${encodeURIComponent(category)}`;
  useEffect(() => {
    const controller = new AbortController();
    fetch(url, {
      credentials: "include",
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    })
      .then(async (response) => {
        if (!response.ok) throw Error();
        return response.json();
      })
      .then((result) => {
        if (!Array.isArray(result.folders)) throw Error();
        set_folders(
          result.folders.flatMap((path) =>
            path
              .split("/")
              .map((_, i, parts) => parts.slice(0, i + 1).join("/")),
          ),
        );
        set_error(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) set_error(true);
      });
    return () => controller.abort();
  }, [url, assets, attempt]);
  useEffect(() => {
    on_folders?.(folders);
  }, [folders, on_folders]);
  return {
    folders,
    error,
    retry: () => set_attempt((value) => value + 1),
  };
}
