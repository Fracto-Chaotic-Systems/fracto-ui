import { useEffect, useState } from "react";
import AppText from "../../AppText.jsx";
import { COMPONENT_STAGE_TEXT } from "../../text/GamesText.jsx";
import { component_request } from "./ComponentDocumentApi.js";
import { SavedComponentList } from "./ComponentStageStyles.jsx";
const text = (key) => AppText.get(COMPONENT_STAGE_TEXT[key]);

export default function SavedComponents({ on_open, disabled }) {
  const [documents, set_documents] = useState([]);
  const [after, set_after] = useState(null);
  const [loading, set_loading] = useState(true);
  const [failed, set_failed] = useState(false);
  const [attempt, set_attempt] = useState(0);
  const [cursor, set_cursor] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    component_request(cursor ? `?after=${encodeURIComponent(cursor)}` : "", {
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(result.documents)) throw new Error("request_error");
        set_documents((current) =>
          cursor ? [...current, ...result.documents] : result.documents,
        );
        set_after(result.next_cursor);
        set_failed(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) set_failed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) set_loading(false);
      });
    return () => controller.abort();
  }, [cursor, attempt]);
  return (
    <SavedComponentList aria-label={text("saved_components")}>
      <strong>{text("saved_components")}</strong>
      {loading && <span role="status">{text("loading")}</span>}
      {failed && (
        <span role="alert">
          {text("request_error")}{" "}
          <button
            disabled={loading}
            onClick={() => {
              set_loading(true);
              set_attempt((value) => value + 1);
            }}
          >
            {text("retry")}
          </button>
        </span>
      )}
      {!loading && !failed && !documents.length && (
        <span>{text("no_saved")}</span>
      )}
      {documents.map((document) => (
        <button
          key={document.id}
          disabled={disabled || loading}
          onClick={() => on_open(document.id)}
        >
          {document.name}
        </button>
      ))}
      {after && !failed && (
        <button
          disabled={loading || disabled}
          onClick={() => {
            set_loading(true);
            set_cursor(after);
          }}
        >
          {text("more")}
        </button>
      )}
    </SavedComponentList>
  );
}
