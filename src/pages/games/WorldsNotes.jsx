import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faPen,
  faExpand,
  faCompress,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useRef, useState } from "react";
import MarkdownDocument from "../../utils/ui/MarkdownDocument.jsx";
import { world_references } from "./WorldsReferences.js";
import MarkdownStyles from "../../utils/ui/styles/MarkdownStyles.jsx";
import PropTypes from "prop-types";
import AppText from "../../AppText.jsx";
import { WORLDS_TEXT } from "../../text/GamesText.jsx";
import {
  NotesInput,
  NotesPreview,
  NotesLayout,
  NotesContent,
  NotesControls,
  NotesIconButton,
} from "./GamesWorldsStyles.jsx";

// Drafts exist only while editing; committed notes always come from the server.
const WorldsNotes = ({
  cardinality,
  value,
  on_save,
  on_reload,
  on_expand,
  on_world,
  world_cards = [],
  world_themes = {},
  expand_request = 0,
}) => {
  const [expanded_height, set_expanded_height] = useState(null);
  const last_expansion = useRef(0);
  useEffect(() => {
    if (expand_request && expand_request !== last_expansion.current) {
      last_expansion.current = expand_request;
      set_expanded_height(on_expand());
    }
  }, [expand_request, on_expand]);
  const [editing, set_editing] = useState(false);
  const [draft, set_draft] = useState(null);
  const [saving, set_saving] = useState(false);
  const [failed, set_failed] = useState(false);
  const save = async () => {
    if (saving || !draft) return;
    if (draft.text === draft.base || draft.text === value) {
      set_draft(null);
      set_editing(false);
      return;
    }
    set_saving(true);
    set_failed(false);
    try {
      await on_save(draft.text, draft.base);
      set_draft(null);
      set_editing(false);
    } catch {
      set_failed(true);
    } finally {
      set_saving(false);
    }
  };
  const icon_button = (key, icon, action, active = false) => (
    <NotesIconButton
      type="button"
      title={AppText.get(WORLDS_TEXT[key])}
      aria-label={`${AppText.get(WORLDS_TEXT[key])} ${cardinality}`}
      aria-pressed={active}
      disabled={saving}
      onClick={action}
    >
      <FontAwesomeIcon icon={icon} />
    </NotesIconButton>
  );
  return (
    <NotesLayout data-notes-layout>
      <NotesContent>
        {!editing && (
          <>
            <MarkdownDocument
              document_component={NotesPreview}
              $expandedHeight={expanded_height}
              remark_plugins={[
                [
                  world_references,
                  { cards: world_cards, themes: world_themes },
                ],
              ]}
              components={{
                a: ({ href, children, title }) => {
                  const match = /^#world-row-(\d+)$/.exec(href ?? "");
                  return (
                    <MarkdownStyles.Link
                      href={href}
                      title={title}
                      target={match ? undefined : "_blank"}
                      rel={match ? undefined : "noopener noreferrer"}
                      onClick={
                        match
                          ? (event) => {
                              event.preventDefault();
                              on_world?.(Number(match[1]));
                            }
                          : undefined
                      }
                    >
                      {children}
                    </MarkdownStyles.Link>
                  );
                },
              }}
            >
              {value}
            </MarkdownDocument>
          </>
        )}
        {editing && (
          <NotesInput
            aria-label={`${AppText.get(WORLDS_TEXT.notes)} ${cardinality}`}
            aria-busy={saving}
            placeholder={AppText.get(WORLDS_TEXT.notes_placeholder)}
            autoFocus
            rows={3}
            style={expanded_height ? { height: expanded_height } : undefined}
            value={draft?.text ?? value}
            disabled={saving}
            onChange={(event) =>
              set_draft((previous) => ({
                base: previous?.base ?? value,
                text: event.target.value,
              }))
            }
            onBlur={(event) => {
              if (
                !event.currentTarget
                  .closest("[data-notes-layout]")
                  ?.querySelector("[data-notes-controls]")
                  ?.contains(event.relatedTarget)
              )
                save();
            }}
          />
        )}
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
                set_editing(false);
                on_reload();
              }}
            >
              {AppText.get(WORLDS_TEXT.reload_notes)}
            </button>
          </div>
        )}
      </NotesContent>
      <NotesControls data-notes-controls>
        {icon_button(
          expanded_height ? "collapse_notes" : "expand_notes",
          expanded_height ? faCompress : faExpand,
          () => {
            set_expanded_height(expanded_height ? null : on_expand());
          },
          !!expanded_height,
        )}
        {editing
          ? icon_button("view_notes", faEye, save)
          : icon_button("edit_notes", faPen, () => {
              set_draft({ base: value, text: value });
              set_editing(true);
            })}
      </NotesControls>
    </NotesLayout>
  );
};
WorldsNotes.propTypes = {
  cardinality: PropTypes.number.isRequired,
  value: PropTypes.string.isRequired,
  on_save: PropTypes.func.isRequired,
  on_reload: PropTypes.func.isRequired,
  on_expand: PropTypes.func.isRequired,
  on_world: PropTypes.func,
  world_cards: PropTypes.arrayOf(PropTypes.number),
  world_themes: PropTypes.objectOf(PropTypes.string),
  expand_request: PropTypes.number,
};
export default WorldsNotes;
