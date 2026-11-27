import { useCallback, useEffect, useState } from "react";
import { component_request } from "./ComponentDocumentApi.js";

const MAX_PAGES = 20;

/** Read every page of saved component documents (50 per page, at most 1,000). */
async function load_component_documents(signal) {
  const loaded = [];
  let cursor = "";
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await component_request(
      cursor ? `?after=${encodeURIComponent(cursor)}` : "",
      { signal },
    );
    if (!Array.isArray(result.documents)) throw new Error("request_error");
    loaded.push(...result.documents);
    cursor = result.next_cursor;
    if (!cursor) break;
  }
  return loaded.map((document) => ({
    ...document,
    folder_path: document.folder_path || "",
  }));
}

/** Every saved component document (id, name, revision, folder_path) for the tree. */
export default function useComponentDocuments() {
  const [documents, set_documents] = useState([]);
  const [loading, set_loading] = useState(true);
  const [failed, set_failed] = useState(false);
  const [attempt, set_attempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    load_component_documents(controller.signal)
      .then((loaded) => {
        if (controller.signal.aborted) return;
        set_documents(loaded);
        set_failed(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) set_failed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) set_loading(false);
      });
    return () => controller.abort();
  }, [attempt]);
  // Stable so callers can pass it on as a callback.
  const reload = useCallback(() => set_attempt((value) => value + 1), []);
  return { documents, loading, failed, reload };
}
