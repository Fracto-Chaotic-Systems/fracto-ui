import AppText from "../../AppText.jsx";
import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import { KEY_GAMES_COMPOSITES_TITLE } from "../../text/GamesText.jsx";
import GamesInventory from "./GamesInventory.jsx";
import { useState } from "react";
import { COMPONENT_STAGE_TEXT } from "../../text/GamesText.jsx";
import ComponentStage from "./ComponentStage.jsx";
import useComponentDocument from "./useComponentDocument.js";
import SavedComponents from "./SavedComponents.jsx";

export default function GamesComposites() {
  const editor = useComponentDocument();
  const [constructing, set_constructing] = useState(false);
  const [pending, set_pending] = useState(null);
  const text = (key) => AppText.get(COMPONENT_STAGE_TEXT[key]);
  const perform = async (action) => {
    set_pending(null);
    if (action.kind === "new") {
      editor.create(text("untitled"));
      set_constructing(true);
    } else if (await editor.load(action.id)) set_constructing(true);
  };
  const request = (action) => {
    if (editor.busy) return;
    if (editor.dirty) set_pending(action);
    else void perform(action);
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
  if (constructing) {
    return (
      <ComponentStage
        editor={editor}
        notice={notice}
        on_reload={() =>
          request({ kind: "load", id: editor.history.present.id })
        }
        on_close={() => set_constructing(false)}
      />
    );
  }
  return (
    <GamesInventory
      category="component"
      empty_message={text("no_published")}
      toolbar={
        <>
          <button
            disabled={editor.busy}
            onClick={() => request({ kind: "new" })}
          >
            {text("new")}
          </button>
          {editor.history && (
            <button
              disabled={editor.busy}
              onClick={() => {
                set_pending(null);
                set_constructing(true);
              }}
            >
              {text("resume")}
            </button>
          )}
          {notice}
          {editor.busy && <p role="status">{text("working")}</p>}
          {editor.message && <p role="status">{text(editor.message)}</p>}
          <SavedComponents
            disabled={editor.busy}
            on_open={(id) => request({ kind: "load", id })}
          />
        </>
      }
    >
      <styles.SectionTitle>
        {AppText.get(KEY_GAMES_COMPOSITES_TITLE)}
      </styles.SectionTitle>
    </GamesInventory>
  );
}
