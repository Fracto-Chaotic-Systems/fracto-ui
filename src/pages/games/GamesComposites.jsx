import AppText from "../../AppText.jsx";
import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import { KEY_GAMES_COMPOSITES_TITLE } from "../../text/GamesText.jsx";
import GamesInventory from "./GamesInventory.jsx";
import { useState } from "react";
import { COMPONENT_STAGE_TEXT } from "../../text/GamesText.jsx";
import ComponentStage from "./ComponentStage.jsx";
import useComponentDocument from "./useComponentDocument.js";
import useComponentDocuments from "./useComponentDocuments.js";
import ComponentFolderMove from "./ComponentFolderMove.jsx";

export default function GamesComposites() {
  const editor = useComponentDocument();
  const saved = useComponentDocuments();
  const { reload: reload_saved } = saved;
  // The stage fills the area right of the tree while a component is selected;
  // selecting a folder or a published asset shows the inventory details instead.
  const [showing_stage, set_showing_stage] = useState(false);
  const [selected_folder, set_selected_folder] = useState(null);
  const [pending, set_pending] = useState(null);
  const text = (key) => AppText.get(COMPONENT_STAGE_TEXT[key]);
  const current_id = editor.history?.present.id ?? null;
  const show_stage = () => {
    set_selected_folder(null);
    set_showing_stage(true);
  };
  const perform = async (action) => {
    set_pending(null);
    if (action.kind === "new") {
      editor.create(text("untitled"));
      show_stage();
    } else if (await editor.load(action.id)) show_stage();
  };
  const request = (action) => {
    if (editor.busy) return;
    if (editor.dirty) set_pending(action);
    else void perform(action);
  };
  const open_document = (id) => {
    // Re-selecting the open component returns to it without reloading (keeps edits).
    if (id === current_id) {
      set_pending(null);
      return show_stage();
    }
    request({ kind: "load", id });
  };
  const notice = pending ? (
    <div role="alert">
      {text("discard_warning")}{" "}
      <button disabled={editor.busy} onClick={() => void perform(pending)}>
        {text("discard_continue")}
      </button>{" "}
      <button onClick={() => set_pending(null)}>{text("cancel")}</button>
    </div>
  ) : null;
  const stored = saved.documents.find((document) => document.id === current_id);
  const stage =
    showing_stage && editor.history ? (
      <ComponentStage
        editor={{
          ...editor,
          // New and renamed components appear in the tree after saving.
          async save() {
            const ok = await editor.save();
            if (ok) reload_saved();
            return ok;
          },
        }}
        folder_control={
          editor.revision > 0 && (
            <ComponentFolderMove
              key={`${current_id}:${stored?.folder_path ?? ""}`}
              id={current_id}
              folder_path={stored?.folder_path ?? ""}
              disabled={editor.busy}
              on_moved={reload_saved}
            />
          )
        }
        on_reload={() => request({ kind: "load", id: current_id })}
      />
    ) : null;
  return (
    <GamesInventory
      category="component"
      empty_message={text("no_published")}
      documents={saved.documents}
      selected_document={current_id}
      on_document_open={open_document}
      selected_folder={selected_folder}
      on_folder_select={(path) => {
        set_selected_folder(path);
        if (path) set_showing_stage(false);
      }}
      on_asset_select={() => set_showing_stage(false)}
      on_tree_changed={reload_saved}
      content={stage}
      documents_status={
        saved.failed ? (
          <p role="alert">
            {text("request_error")}{" "}
            <button disabled={saved.loading} onClick={reload_saved}>
              {text("retry")}
            </button>
          </p>
        ) : saved.loading && !saved.documents.length ? (
          <p role="status">{text("loading")}</p>
        ) : null
      }
      toolbar={
        <>
          <button
            disabled={editor.busy}
            onClick={() => request({ kind: "new" })}
          >
            {text("new")}
          </button>
          {editor.history && !stage && (
            <button
              disabled={editor.busy}
              onClick={() => {
                set_pending(null);
                show_stage();
              }}
            >
              {text("resume")}
            </button>
          )}
          {notice}
          {!stage && editor.busy && <p role="status">{text("working")}</p>}
          {!stage && editor.message && (
            <p role="status">{text(editor.message)}</p>
          )}
        </>
      }
    >
      <styles.SectionTitle>
        {AppText.get(KEY_GAMES_COMPOSITES_TITLE)}
      </styles.SectionTitle>
    </GamesInventory>
  );
}
