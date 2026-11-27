import {
  create_component_history,
  edit_component_history,
  undo_component_history,
  redo_component_history,
} from "@fracto/sdk/FractoComponentDocument.js";
import { apply_component_commands } from "@fracto/sdk/FractoComponentTools.js";
import { replay_component_proposal } from "./ComponentProposal.js";
import {
  construction_note,
  proposal_note,
  create_note_history,
  note_edit,
  note_undo,
  note_redo,
} from "./ComponentEditNotes.js";

// Applies an SDK history edit and the matching edit label together.
const edited = (state, history, label) => ({
  history,
  notes: note_edit(
    state.notes ?? create_note_history(),
    state.history,
    history,
    label,
  ),
});

export const component_is_dirty = (state) =>
  !!state.history && JSON.stringify(state.history.present) !== state.saved_json;
/**
 * After a save, the snapshot that was saved: usually the present one, but an
 * edit made while the save was in flight leaves it in the undo lineage.
 */
function saved_state(state, action) {
  const saved_json = JSON.stringify(action.document);
  const saved_ref =
    [state.history.present, ...[...state.history.past].reverse()].find(
      (snapshot) => JSON.stringify(snapshot) === saved_json,
    ) ?? null;
  return { ...state, revision: action.revision, saved_json, saved_ref };
}
export function component_document_reducer(state, action) {
  switch (action.type) {
    case "open": {
      const history = create_component_history(action.document);
      return {
        history,
        notes: create_note_history(),
        // The saved snapshot (by identity), to find edits made since the save.
        saved_ref: action.revision ? history.present : null,
        revision: action.revision,
        saved_json: action.revision ? JSON.stringify(action.document) : null,
      };
    }
    case "edit":
      return {
        ...state,
        construction_error: null,
        ...edited(
          state,
          edit_component_history(state.history, action.document),
          action.label,
        ),
      };
    case "construct":
      try {
        if (
          action.expected_id !== undefined &&
          action.expected_id !== state.history.present.id
        )
          return {
            ...state,
            construction_error: "construction_document_changed",
          };
        const document = apply_component_commands(
          state.history.present,
          action.commands,
          action.materials,
        );
        return {
          ...state,
          construction_error: null,
          ...edited(
            state,
            edit_component_history(state.history, document),
            construction_note(action.commands),
          ),
        };
      } catch (error) {
        return { ...state, construction_error: error.message };
      }
    case "apply-proposal":
      try {
        const document = replay_component_proposal(
          action.plan,
          state.history.present,
          action.materials,
        );
        return {
          ...state,
          construction_error: null,
          proposal_result: { id: action.plan.proposal_id, applied: true },
          ...edited(
            state,
            edit_component_history(state.history, document),
            proposal_note(action.plan),
          ),
        };
      } catch (error) {
        return {
          ...state,
          construction_error: error.message,
          proposal_result: {
            id: action.plan?.proposal_id,
            applied: false,
            error: error.message,
          },
        };
      }
    case "undo": {
      const history = undo_component_history(state.history);
      return history === state.history
        ? state
        : { ...state, history, notes: state.notes && note_undo(state.notes) };
    }
    case "redo": {
      const history = redo_component_history(state.history);
      return history === state.history
        ? state
        : { ...state, history, notes: state.notes && note_redo(state.notes) };
    }
    case "renamed": {
      // An immediate name save: every snapshot and the saved copy take the new
      // name, so other unsaved edits stay unsaved and undo never reverts it.
      if (state.history.present.id !== action.document.id) return state;
      // Renamed copies keep the saved snapshot findable by identity.
      let saved_ref = null;
      const rename = (document) => {
        const copy = { ...document, name: action.document.name };
        if (document === state.saved_ref) saved_ref = copy;
        return copy;
      };
      return {
        ...state,
        revision: action.revision,
        saved_json: JSON.stringify(action.document),
        history: {
          past: state.history.past.map(rename),
          present: rename(state.history.present),
          future: state.history.future.map(rename),
        },
        saved_ref,
      };
    }
    case "saved":
      return state.history.present.id !== action.document.id
        ? state
        : saved_state(state, action);
    default:
      throw new Error("unknown_component_action");
  }
}
