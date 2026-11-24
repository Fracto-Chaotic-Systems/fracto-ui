import { useEffect, useReducer, useRef, useState } from "react";
import {
  create_component_document,
  validate_component_document,
} from "@fracto/sdk/FractoComponentDocument.js";
import {
  component_document_reducer,
  component_is_dirty,
} from "./ComponentDocumentState.js";
import {
  component_request,
  validate_component_response,
} from "./ComponentDocumentApi.js";

export default function useComponentDocument() {
  const [state, dispatch] = useReducer(component_document_reducer, {
    history: null,
    revision: 0,
    saved_json: null,
  });
  const [busy, set_busy] = useState(false);
  const [message, set_message] = useState(null);
  const pending = useRef(false);
  const dirty = component_is_dirty(state);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const run = async (operation) => {
    if (pending.current) return false;
    pending.current = true;
    set_busy(true);
    set_message(null);
    try {
      await operation();
      return true;
    } catch (error) {
      set_message(
        ["conflict", "invalid_component_document"].includes(error.message)
          ? error.message
          : "request_error",
      );
      return false;
    } finally {
      pending.current = false;
      set_busy(false);
    }
  };
  return {
    ...state,
    dirty,
    busy,
    message,
    create(name) {
      if (pending.current) return;
      dispatch({
        type: "open",
        document: create_component_document(crypto.randomUUID(), name),
        revision: 0,
      });
      set_message(null);
    },
    edit(document) {
      dispatch({ type: "edit", document });
      set_message(null);
    },
    construct(commands, materials, expected_id) {
      dispatch({ type: "construct", commands, materials, expected_id });
      set_message(null);
    },
    apply_proposal(plan, materials) {
      dispatch({ type: "apply-proposal", plan, materials });
      set_message(null);
    },
    undo() {
      dispatch({ type: "undo" });
      set_message(null);
    },
    redo() {
      dispatch({ type: "redo" });
      set_message(null);
    },
    load(id) {
      return run(async () => {
        const result = validate_component_response(
          await component_request(`/${encodeURIComponent(id)}`),
        );
        if (result.document.id !== id) throw new Error("request_error");
        dispatch({ type: "open", ...result });
      });
    },
    save() {
      return run(async () => {
        const document = validate_component_document(state.history.present);
        const result = validate_component_response(
          await component_request(`/${document.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              document,
              expected_revision: state.revision,
            }),
          }),
        );
        if (JSON.stringify(result.document) !== JSON.stringify(document))
          throw new Error("request_error");
        dispatch({ type: "saved", ...result });
        set_message("saved");
      });
    },
  };
}
