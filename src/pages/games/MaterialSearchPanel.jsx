import { useEffect, useState } from "react";
import AppText from "../../AppText.jsx";
import { MATERIAL_TEXT } from "../../text/GamesText.jsx";
import { MATERIAL_PLACEMENTS } from "@fracto/sdk/FractoMaterialMetadata.js";
import MaterialFacts from "./MaterialFacts.jsx";
import MaterialMetadataPanel from "./MaterialMetadataPanel.jsx";
import { MaterialSearchStyles } from "./MaterialSearchStyles.jsx";
import { construction_text } from "./ComponentToolFields.jsx";
const text = (key) => AppText.get(MATERIAL_TEXT[key]);
export default function MaterialSearchPanel({ on_choose, disabled = false }) {
  const [q, set_q] = useState(""),
    [placement, set_placement] = useState("");
  const [query, set_query] = useState(null),
    [result, set_result] = useState(null);
  const [busy, set_busy] = useState(false),
    [message, set_message] = useState("");
  const [selected, set_selected] = useState(null);
  const [editing, set_editing] = useState(false);
  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      q: query.q,
      placement: query.placement,
      limit: "10",
      offset: String(query.offset),
    });
    if (query.snapshot) params.set("snapshot", query.snapshot);
    fetch(
      `${import.meta.env.BASE_URL}api/environment-catalog/materials/search?${params}`,
      {
        credentials: "include",
        cache: "no-store",
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(20000),
        ]),
      },
    )
      .then(async (response) => {
        if (!response.ok)
          throw new Error(response.status === 409 ? "search_changed" : "error");
        const page = await response.json();
        if (!controller.signal.aborted) {
          set_result((current) =>
            query.offset
              ? {
                  ...page,
                  materials: [...current.materials, ...page.materials],
                }
              : page,
          );
          set_message("");
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          set_message(
            error.message === "search_changed" ? "search_changed" : "error",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) set_busy(false);
      });
    return () => controller.abort();
  }, [query]);
  const search = (event) => {
    event.preventDefault();
    if (editing || busy) return;
    set_result(null);
    set_selected(null);
    set_message("loading");
    set_busy(true);
    set_query({ q, placement, offset: 0 });
  };
  return (
    <MaterialSearchStyles aria-label={text("search_title")}>
      <h3>{text("search_title")}</h3>
      <form onSubmit={search}>
        <label>
          {text("query")}
          <input
            maxLength={200}
            value={q}
            onChange={(event) => set_q(event.target.value)}
          />
        </label>
        <label>
          {text("placement")}
          <select
            value={placement}
            onChange={(event) => set_placement(event.target.value)}
          >
            <option value="">{text("all")}</option>
            {MATERIAL_PLACEMENTS.map((value) => (
              <option key={value} value={value}>
                {text(value)}
              </option>
            ))}
          </select>
        </label>
        <button disabled={busy || editing} type="submit">
          {text("search")}
        </button>
      </form>
      <p>{text("search_help")}</p>
      {message && (
        <p role={message === "loading" ? "status" : "alert"}>{text(message)}</p>
      )}
      {result && (
        <>
          <p role="status">
            {text("results").replace("{count}", result.total)}
          </p>
          {!!result.unmatched_terms.length && (
            <p>
              {text("unmatched")}: {result.unmatched_terms.join(", ")}
            </p>
          )}
          {result.materials.map((material) => (
            <details key={material.id}>
              <summary>{material.name}</summary>
              <MaterialFacts material={material} />
              {on_choose && (
                <button
                  disabled={editing || disabled}
                  onClick={() => on_choose(material)}
                >
                  {construction_text("use_material")}
                </button>
              )}
              <button
                disabled={editing}
                onClick={() => set_selected(material.id)}
              >
                {text("edit")}
              </button>
            </details>
          ))}
          {result.next_offset !== null && (
            <button
              disabled={busy || editing}
              onClick={() => {
                set_busy(true);
                set_message("loading");
                set_query({
                  ...query,
                  offset: result.next_offset,
                  snapshot: result.snapshot,
                });
              }}
            >
              {text("more")}
            </button>
          )}
        </>
      )}
      {selected && (
        <MaterialMetadataPanel
          key={selected}
          asset_id={selected}
          on_editing_change={set_editing}
          on_saved={() => {
            set_result(null);
            set_message("search_changed");
          }}
        />
      )}
    </MaterialSearchStyles>
  );
}
