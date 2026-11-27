import { useEffect, useMemo, useRef, useState } from "react";
import { preview_component_variant } from "@fracto/sdk/FractoComponentVariant.js";
import AppText from "../../AppText.jsx";
import { COMPONENT_STAGE_TEXT, INVENTORY_TEXT } from "../../text/GamesText.jsx";
import {
  InventoryToolbar,
  InventoryCaption,
  InventoryStatus,
  InventoryControls,
  InventoryDetails,
} from "./InventoryStyles.jsx";
import CoolTabs from "../../utils/ui/CoolTabs.jsx";
import {
  StageHost,
  StageWorkspace,
  StageViewport,
  StagePane,
  StageTab,
  StagePreviewNotice,
} from "./ComponentStageStyles.jsx";
import { create_component_stage } from "./ComponentStageScene.js";
import { construction_text } from "./ComponentToolFields.jsx";
import ComponentConstructionDocument from "./ComponentConstructionDocument.jsx";
import ComponentVariants from "./ComponentVariants.jsx";
import ComponentNameEdit from "./ComponentNameEdit.jsx";
import ComponentStageLightingControls from "./ComponentStageLightingControls.jsx";
import {
  PreviewAnimationToggle,
  PreviewScaleControls,
} from "./InventoryPreviewControls.jsx";

const text = (key) => AppText.get(COMPONENT_STAGE_TEXT[key]);

export default function ComponentStage({
  editor,
  notice,
  on_reload,
  folder_control = null,
}) {
  const draft = editor.history.present;
  const host = useRef(null);
  const scene = useRef(null);
  const [failed, set_failed] = useState(false);
  const [attempt, set_attempt] = useState(0);
  const [content_status, set_content_status] = useState("content_ready");
  const [details_tab, set_details_tab] = useState(0);
  const [selection, set_selection] = useState(null);
  const [walk, set_walk] = useState({ active: false, locked: false });
  // View-only preview settings, like the materials page (not saved).
  const [preview_options, set_preview_options] = useState({
    scale: 1,
    animation: true,
  });
  const [info, set_info] = useState(null);
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
        on_walk: set_walk,
        on_info: set_info,
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
      set_walk({ active: false, locked: false });
    };
  }, [attempt]);
  useEffect(() => {
    void scene.current?.update_document(preview.document, {
      clip_rates: preview.clip_rates,
    });
  }, [preview, attempt]);

  useEffect(() => {
    scene.current?.set_preview(preview_options);
  }, [preview_options, attempt]);
  return (
    <StageHost
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
      <InventoryToolbar>
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
      {/* The Walk (first-person) button is hidden for now; it returns with
          the "areas" section. Walk mode itself (scene set_walking, notices,
          text) is kept intact. */}
      <StageWorkspace>
        {/* Like the materials page: the stage above, model details in tabs below. */}
        <StagePane>
          <StageViewport ref={host}>
            {walk.active && !failed && (
              <StagePreviewNotice role="status">
                {walk.flying && <strong>{text("walk_flying")} · </strong>}
                {text(walk.locked ? "walk_controls" : "walk_click")}
              </StagePreviewNotice>
            )}
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
          <InventoryDetails
            tabIndex={0}
            role="region"
            aria-label={text("component_details")}
          >
            <CoolTabs
              labels={[text("tab_construction")]}
              tab_index={details_tab}
              on_tab_select={set_details_tab}
              selected_content={
                <StageTab>
                  <ComponentConstructionDocument document={draft} />
                </StageTab>
              }
            />
          </InventoryDetails>
        </StagePane>
        {/* A generic right panel like the materials page: name, folder,
            lighting, then the variants. */}
        <InventoryControls aria-label={AppText.get(INVENTORY_TEXT.asset)}>
          <ComponentNameEdit
            key={draft.name}
            name={draft.name}
            disabled={editor.busy}
            on_rename={editor.rename}
          />
          {folder_control}
          {info?.animated && (
            <PreviewAnimationToggle
              checked={preview_options.animation}
              on_change={(animation) =>
                set_preview_options((current) => ({ ...current, animation }))
              }
            />
          )}
          <PreviewScaleControls
            scale={preview_options.scale}
            height={info?.height ?? null}
            on_change={(scale) =>
              set_preview_options((current) => ({ ...current, scale }))
            }
          />
          <ComponentStageLightingControls
            document={draft}
            on_change={editor.edit}
            disabled={editor.busy}
          />
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
        </InventoryControls>
      </StageWorkspace>
      {preview.error && <p role="alert">{text("variant_preview_error")}</p>}
      <InventoryCaption>
        {text(walk.active ? "walk_navigation" : "navigation")}
      </InventoryCaption>
    </StageHost>
  );
}
