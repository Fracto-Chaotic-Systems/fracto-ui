import { useEffect, useState } from "react";
import AppText from "../../AppText.jsx";
import { COMPONENT_STAGE_TEXT } from "../../text/GamesText.jsx";
import { component_request } from "./ComponentDocumentApi.js";
import { StageHistoryList } from "./ComponentStageStyles.jsx";

const text = (key) => AppText.get(COMPONENT_STAGE_TEXT[key]);

/**
 * The "history" tab: dated change entries for a saved component, newest first,
 * in the same form as a material's history (date · action, then description).
 * Reloads when opened and after each save (revision change).
 */
export default function ComponentHistoryTab({ id, revision }) {
  const [state, set_state] = useState({
    key: null,
    history: null,
    failed: false,
  });
  const [attempt, set_attempt] = useState(0);
  const key = `${id}:${revision}:${attempt}`;
  useEffect(() => {
    if (!revision) return;
    const controller = new AbortController();
    component_request(`/${encodeURIComponent(id)}/history`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (!Array.isArray(result.history)) throw new Error("request_error");
        set_state({ key, history: result.history, failed: false });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          set_state({ key, history: null, failed: true });
      });
    return () => controller.abort();
  }, [id, revision, key]);
  if (!revision) return <p>{text("history_unsaved")}</p>;
  if (state.key !== key || (!state.history && !state.failed))
    return <p role="status">{text("history_loading")}</p>;
  if (state.failed)
    return (
      <p role="alert">
        {text("request_error")}{" "}
        <button onClick={() => set_attempt((value) => value + 1)}>
          {text("retry")}
        </button>
      </p>
    );
  if (!state.history.length) return <p>{text("history_empty")}</p>;
  return (
    <StageHistoryList>
      {state.history.map((entry, index) => (
        <li key={`${entry.recorded_at}:${index}`}>
          <time dateTime={entry.recorded_at}>{entry.date}</time> ·{" "}
          {entry.action}
          <p>{entry.description}</p>
        </li>
      ))}
    </StageHistoryList>
  );
}
