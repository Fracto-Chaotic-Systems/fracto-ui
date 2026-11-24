import { useEffect, useMemo, useRef, useState } from "react";
import { preview_component_variant } from "@fracto/sdk/FractoComponentVariant.js";
import AppText from "../../AppText.jsx";
import {
  COMPONENT_STAGE_TEXT,
  KEY_GAMES_COMPOSITES_TITLE,
} from "../../text/GamesText.jsx";
import { MainStyles } from "../../styles/MainStyles.jsx";
import {
  InventoryLayout,
  InventoryToolbar,
  InventoryCaption,
  InventoryStatus,
} from "./InventoryStyles.jsx";
import {
  StageWorkspace,
  StageViewport,
  StageViewButtons,
} from "./ComponentStageStyles.jsx";
import { create_component_stage } from "./ComponentStageScene.js";
import { construction_text } from "./ComponentToolFields.jsx";
import ComponentConstructionDocument from "./ComponentConstructionDocument.jsx";
import ComponentVariants from "./ComponentVariants.jsx";
import ComponentStageLightingControls from "./ComponentStageLightingControls.jsx";

const text = (key) => AppText.get(COMPONENT_STAGE_TEXT[key]);

export default function ComponentStage({
  editor,
  notice,
  on_reload,
  on_close,
}) {
  const draft = editor.history.present;
  const host = useRef(null);
  const scene = useRef(null);
  const [failed, set_failed] = useState(false);
  const [attempt, set_attempt] = useState(0);
  const [content_status, set_content_status] = useState("content_ready");
  const [document_view, set_document_view] = useState(false);
  const [selection, set_selection] = useState(null);
  const selected =
    selection?.component_id === draft.id ? selection.variant : null;
  const preview = useMemo(() => {
    if (selected) {
      try {
        return preview_component_variant(draft, selected, editor.revision);
      } catch {
        return { document: draft, clip_rates: {}, error: true };
      }
    }
    return { document: draft, clip_rates: {} };
  }, [draft, selected, editor.revision]);
  useEffect(() => {
    let active = true;
    try {
      scene.current = create_component_stage(host.current, {
        label: text("view"),
        on_error: () => set_failed(true),
        on_status: set_content_status,
      });
    } catch {
      queueMicrotask(() => {
        if (active) set_failed(true);
      });
    }
    return () => {
      active = false;
      scene.current?.dispose();
      scene.current = null;
    };
  }, [attempt]);
  useEffect(() => {
    void scene.current?.update_document(preview.document, {
      clip_rates: preview.clip_rates,
    });
  }, [preview, attempt]);
  useEffect(() => {
    scene.current?.set_visible(!document_view);
  }, [document_view, attempt]);

  return (
    <InventoryLayout
      onKeyDown={(event) => {
        if (!(event.ctrlKey || event.metaKey) || editor.busy) return;
        if (event.key.toLowerCase() === "s") {
          event.preventDefault();
          void editor.save();
        }
        if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName))
          return;
        if (event.key.toLowerCase() === "z") {
          event.preventDefault();
          if (event.shiftKey) editor.redo();
          else editor.undo();
        }
        if (event.key.toLowerCase() === "y") {
          event.preventDefault();
          editor.redo();
        }
      }}
    >
      <MainStyles.SectionTitle>
        {AppText.get(KEY_GAMES_COMPOSITES_TITLE)}
      </MainStyles.SectionTitle>
      <InventoryToolbar>
        <button disabled={editor.busy} onClick={on_close}>
          {text("back")}
        </button>{" "}
        <button
          disabled={editor.busy || !editor.dirty}
          onClick={() => void editor.save()}
        >
          {text("save")}
        </button>{" "}
        <button
          disabled={editor.busy || !editor.history.past.length}
          onClick={editor.undo}
        >
          {text("undo")}
        </button>{" "}
        <button
          disabled={editor.busy || !editor.history.future.length}
          onClick={editor.redo}
        >
          {text("redo")}
        </button>{" "}
        {(editor.revision > 0 || editor.message === "conflict") && (
          <button disabled={editor.busy} onClick={on_reload}>
            {text("reload")}
          </button>
        )}
        <span role="status">
          {text(editor.busy ? "working" : editor.dirty ? "unsaved" : "saved")}
        </span>
        {editor.message && (
          <p role={editor.message === "saved" ? "status" : "alert"}>
            {text(editor.message)}
          </p>
        )}
        {notice}
      </InventoryToolbar>
      <StageViewButtons aria-label={text("editor_views")}>
        <button
          type="button"
          aria-pressed={!document_view}
          onClick={() => set_document_view(false)}
        >
          {text("stage_view")}
        </button>
        <button
          type="button"
          aria-pressed={document_view}
          onClick={() => set_document_view(true)}
        >
          {text("construction_document")}
        </button>
      </StageViewButtons>
      <ComponentConstructionDocument
        document={draft}
        on_change={editor.edit}
        disabled={editor.busy}
        hidden={!document_view}
      />
      <ComponentStageLightingControls
        document={draft}
        on_change={editor.edit}
        disabled={editor.busy}
        hidden={document_view}
      />
      <StageWorkspace $hidden={document_view}>
        <StageViewport ref={host}>
          {!failed && content_status !== "content_ready" && (
            <InventoryStatus role="status">
              {construction_text(content_status)}{" "}
              {content_status !== "loading_content" && (
                <button onClick={() => set_attempt((value) => value + 1)}>
                  {text("retry")}
                </button>
              )}
            </InventoryStatus>
          )}
          {failed && (
            <InventoryStatus role="alert">
              {text("error")}{" "}
              <button
                onClick={() => {
                  set_failed(false);
                  set_attempt((value) => value + 1);
                }}
              >
                {text("retry")}
              </button>
            </InventoryStatus>
          )}
        </StageViewport>
        <ComponentVariants
          key={draft.id}
          component_id={draft.id}
          selected_key={preview.error ? null : selected?.key}
          on_select={(variant) =>
            set_selection((current) =>
              current?.component_id === draft.id &&
              current.variant.key === variant.key
                ? null
                : { component_id: draft.id, variant },
            )
          }
        />
      </StageWorkspace>
      {preview.error && <p role="alert">{text("variant_preview_error")}</p>}
      <InventoryCaption>{text("navigation")}</InventoryCaption>
    </InventoryLayout>
  );
}
