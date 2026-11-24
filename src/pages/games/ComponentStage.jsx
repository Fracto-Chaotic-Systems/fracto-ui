import { useEffect, useRef, useState } from "react";
import AppText from "../../AppText.jsx";
import {
  COMPONENT_STAGE_TEXT,
  KEY_GAMES_COMPOSITES_TITLE,
} from "../../text/GamesText.jsx";
import { MainStyles } from "../../styles/MainStyles.jsx";
import {
  InventoryLayout,
  InventoryToolbar,
  InventoryControls,
  InventoryCaption,
  InventoryStatus,
} from "./InventoryStyles.jsx";
import {
  StageWorkspace,
  StageViewport,
  StagePreviewNotice,
} from "./ComponentStageStyles.jsx";
import useComponentPlanner from "./useComponentPlanner.js";
import ComponentConversation, {
  planner_text,
} from "./ComponentConversation.jsx";
import useConstructionMemory from "./useConstructionMemory.js";
import { create_component_stage } from "./ComponentStageScene.js";
import MaterialSearchPanel from "./MaterialSearchPanel.jsx";
import useComponentConstruction from "./useComponentConstruction.js";
import ComponentConstructionTools from "./ComponentConstructionTools.jsx";
import { construction_text } from "./ComponentToolFields.jsx";

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
  const [selected, set_selected] = useState("");
  const [content_status, set_content_status] = useState("content_ready");
  const tools = useComponentConstruction(editor);
  const memory = useConstructionMemory();
  const planner = useComponentPlanner(editor, { memory: memory.library });
  const displayed = planner.preview || draft;
  useEffect(() => {
    let active = true;
    try {
      scene.current = create_component_stage(host.current, {
        label: text("view"),
        on_error: () => set_failed(true),
        on_status: set_content_status,
        on_select: set_selected,
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
    void scene.current?.update_document(displayed);
  }, [displayed, attempt]);
  useEffect(() => {
    scene.current?.select(selected);
  }, [selected, attempt]);

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
      <StageWorkspace>
        <StageViewport ref={host}>
          {planner.previewing && (
            <StagePreviewNotice role="status">
              {planner_text("preview_notice")}
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
        <InventoryControls aria-label={text("properties")}>
          <ComponentConversation
            memory={memory}
            planner={planner}
            disabled={editor.busy || tools.busy}
          />
          <strong>{text("title")}</strong>
          <label>
            {text("name")}
            <input
              value={draft.name}
              disabled={
                editor.busy ||
                planner.previewing ||
                planner.phase === "applying"
              }
              maxLength={120}
              onChange={(event) =>
                editor.edit({ ...draft, name: event.target.value })
              }
            />
          </label>
          <div>
            {text("objects")}{" "}
            <output>
              {draft.objects.length +
                draft.scatters.reduce((sum, rule) => sum + rule.count, 0)}
            </output>
          </div>
          <InventoryCaption>
            {text(
              draft.floor || draft.objects.length || draft.scatters.length
                ? "content_pending"
                : "empty",
            )}
          </InventoryCaption>
          <label>
            {text("animation_speed")}
            <input
              type="number"
              min={0}
              max={10}
              step={0.05}
              value={draft.animation_speed ?? 1}
              disabled={
                editor.busy ||
                planner.previewing ||
                planner.phase === "applying"
              }
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                if (Number.isFinite(value) && value >= 0 && value <= 10)
                  editor.edit({ ...draft, animation_speed: value });
              }}
            />
          </label>
          <InventoryCaption>{text("animation_speed_help")}</InventoryCaption>
          <button
            disabled={failed}
            onClick={() => scene.current?.reset_camera()}
          >
            {text("reset")}
          </button>
          <InventoryCaption>{text("draft")}</InventoryCaption>
          <ComponentConstructionTools
            document={draft}
            tools={{
              ...tools,
              busy:
                tools.busy ||
                planner.previewing ||
                planner.phase === "applying",
            }}
            editor={editor}
            selected={selected}
            on_select={set_selected}
          />
          <MaterialSearchPanel
            on_choose={tools.choose}
            disabled={
              tools.busy ||
              editor.busy ||
              planner.previewing ||
              planner.phase === "applying"
            }
          />
        </InventoryControls>
      </StageWorkspace>
      <InventoryCaption>{text("navigation")}</InventoryCaption>
    </InventoryLayout>
  );
}
