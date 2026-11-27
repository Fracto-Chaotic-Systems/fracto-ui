import {
  create_component_history,
  edit_component_history,
  undo_component_history,
  redo_component_history,
} from "@fracto/sdk/FractoComponentDocument.js";
import { apply_component_commands } from "@fracto/sdk/FractoComponentTools.js";
import { replay_component_proposal } from "./ComponentProposal.js";

export const component_is_dirty = (state) =>
  !!state.history && JSON.stringify(state.history.present) !== state.saved_json;
export function component_document_reducer(state, action) {
  switch (action.type) {
    case "open":
      return {
        history: create_component_history(action.document),
        revision: action.revision,
        saved_json: action.revision ? JSON.stringify(action.document) : null,
      };
    case "edit":
      return {
        ...state,
        construction_error: null,
        history: edit_component_history(state.history, action.document),
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
          history: edit_component_history(state.history, document),
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
          history: edit_component_history(state.history, document),
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
    case "undo":
      return { ...state, history: undo_component_history(state.history) };
    case "redo":
      return { ...state, history: redo_component_history(state.history) };
    case "renamed": {
      // An immediate name save: every snapshot and the saved copy take the new
      // name, so other unsaved edits stay unsaved and undo never reverts it.
      if (state.history.present.id !== action.document.id) return state;
      const rename = (document) => ({
        ...document,
        name: action.document.name,
      });
      return {
        ...state,
        revision: action.revision,
        saved_json: JSON.stringify(action.document),
        history: {
          past: state.history.past.map(rename),
          present: rename(state.history.present),
          future: state.history.future.map(rename),
        },
      };
    }
    case "saved":
      return state.history.present.id !== action.document.id
        ? state
        : {
            ...state,
            revision: action.revision,
            saved_json: JSON.stringify(action.document),
          };
    default:
      throw new Error("unknown_component_action");
  }
}
