import { useState } from "react";
import PropTypes from "prop-types";
import AppText from "../../AppText.jsx";
import { WORLDS_TEXT } from "../../text/GamesText.jsx";
import { NotesInput } from "./GamesWorldsStyles.jsx";

// Drafts exist only while editing; committed notes always come from the server.
const WorldsNotes = ({ cardinality, value, on_save, on_reload }) => {
  const [draft, set_draft] = useState(null);
  const [saving, set_saving] = useState(false);
  const [failed, set_failed] = useState(false);
  const save = async () => {
    if (saving || !draft) return;
    if (draft.text === draft.base || draft.text === value) {
      set_draft(null);
      return;
    }
    set_saving(true);
    set_failed(false);
    try {
      await on_save(draft.text, draft.base);
      set_draft(null);
    } catch {
      set_failed(true);
    } finally {
      set_saving(false);
    }
  };
  return (
    <>
      <NotesInput
        aria-label={`${AppText.get(WORLDS_TEXT.notes)} ${cardinality}`}
        aria-busy={saving}
        placeholder={AppText.get(WORLDS_TEXT.notes_placeholder)}
        rows={3}
        value={draft?.text ?? value}
        disabled={saving}
        onChange={(event) =>
          set_draft((previous) => ({
            base: previous?.base ?? value,
            text: event.target.value,
          }))
        }
        onBlur={save}
      />
      {failed && (
        <div role="alert">
          {AppText.get(WORLDS_TEXT.save_notes_error)}{" "}
          <button type="button" onClick={save}>
            {AppText.get(WORLDS_TEXT.retry)}
          </button>{" "}
          <button
            type="button"
            onClick={() => {
              set_draft(null);
              set_failed(false);
              on_reload();
            }}
          >
            {AppText.get(WORLDS_TEXT.reload_notes)}
          </button>
        </div>
      )}
    </>
  );
};
WorldsNotes.propTypes = {
  cardinality: PropTypes.number.isRequired,
  value: PropTypes.string.isRequired,
  on_save: PropTypes.func.isRequired,
  on_reload: PropTypes.func.isRequired,
};
export default WorldsNotes;
