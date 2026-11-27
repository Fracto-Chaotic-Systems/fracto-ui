import { useEffect, useState } from "react";
import AppText from "../../AppText.jsx";
import { MATERIAL_TEXT } from "../../text/GamesText.jsx";
import { CatalogPanel, CatalogActions } from "./InventoryCatalogStyles.jsx";
import {
  material_form,
  material_edit_from_form,
} from "./MaterialMetadataForm.js";
import MaterialMetadataEditor from "./MaterialMetadataEditor.jsx";
import MaterialFacts from "./MaterialFacts.jsx";
const text = (key) => AppText.get(MATERIAL_TEXT[key]);
const endpoint = (id) =>
  `${import.meta.env.BASE_URL}api/environment-catalog/${encodeURIComponent(id)}/construction`;
async function request(id, options = {}) {
  const response = await fetch(endpoint(id), {
    credentials: "include",
    cache: "no-store",
    ...options,
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)])
      : AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error(response.status === 409 ? "conflict" : "error");
  return (await response.json()).material;
}
export default function MaterialMetadataPanel({
  asset_id,
  disabled = false,
  on_editing_change,
  on_saved,
}) {
  const [material, set_material] = useState(null),
    [form, set_form] = useState(null);
  const [busy, set_busy] = useState(false),
    [message, set_message] = useState("loading"),
    [attempt, set_attempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    request(asset_id, { signal: controller.signal })
      .then((next) => {
        if (!controller.signal.aborted) {
          set_material(next);
          set_message("");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) set_message("error");
      });
    return () => controller.abort();
  }, [asset_id, attempt]);
  const editing = !!form;
  useEffect(() => {
    on_editing_change?.(editing);
    return () => on_editing_change?.(false);
  }, [editing, on_editing_change]);
  const reload = () => {
    set_form(null);
    set_message("loading");
    set_attempt((value) => value + 1);
  };
  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    set_busy(true);
    set_message("saving");
    try {
      const body = material_edit_from_form(form, material.revision);
      const next = await request(asset_id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      set_material(next);
      set_form(null);
      set_message("saved");
      on_saved?.(next);
    } catch (error) {
      set_message(
        ["conflict", "invalid_material_metadata"].includes(error.message)
          ? error.message
          : "error",
      );
    } finally {
      set_busy(false);
    }
  };
  return (
    <CatalogPanel
      $bare
      aria-label={text("metadata")}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "s"
        ) {
          event.preventDefault();
          if (form) void save(event);
        }
      }}
    >
      {material && !form && (
        <>
          <MaterialFacts material={material} />
          <button
            disabled={busy || disabled || message === "loading"}
            onClick={() => {
              set_form(material_form(material));
              set_message("");
            }}
          >
            {text("edit")}
          </button>
        </>
      )}
      {form && (
        <MaterialMetadataEditor
          form={form}
          on_change={set_form}
          on_save={save}
          on_cancel={() => {
            set_form(null);
            set_message("");
          }}
          busy={busy}
        />
      )}
      {message && (
        <p
          role={
            ["error", "conflict", "invalid_material_metadata"].includes(message)
              ? "alert"
              : "status"
          }
        >
          {text(message)}
        </p>
      )}
      <CatalogActions>
        <button
          disabled={busy || disabled || message === "loading"}
          onClick={reload}
        >
          {text(form ? "discard_reload" : "reload")}
        </button>
      </CatalogActions>
    </CatalogPanel>
  );
}
