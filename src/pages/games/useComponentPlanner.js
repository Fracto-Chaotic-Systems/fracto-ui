import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { component_document_json } from "@fracto/sdk/FractoComponentDocument.js";
import { request_component_plan } from "./ComponentPlannerApi.js";
import {
  prepare_component_proposal,
  proposal_references,
  replay_component_proposal,
} from "./ComponentProposal.js";
import { resolve_component_references } from "./ComponentMaterialApi.js";
import {
  EMPTY_CONSTRUCTION_MEMORY,
  select_construction_patterns,
} from "@fracto/sdk/FractoConstructionMemory.js";

// Session-only conversation. A pending brief is retained for clarifications;
// applied construction is represented by the current document, not a transcript.
export default function useComponentPlanner(
  editor,
  {
    request = request_component_plan,
    resolve = resolve_component_references,
    memory = EMPTY_CONSTRUCTION_MEMORY,
  } = {},
) {
  const [phase, set_phase] = useState("idle"),
    [entries, set_entries] = useState([]),
    [proposal, set_proposal] = useState(null),
    [previewing, set_previewing] = useState(false),
    [error, set_error] = useState(null),
    [document_id, set_document_id] = useState(editor.history.present.id),
    [acknowledged, set_acknowledged] = useState(editor.proposal_result),
    [last_applied, set_last_applied] = useState(null),
    [memory_signature, set_memory_signature] = useState(JSON.stringify(memory));
  const current_memory = JSON.stringify(memory);
  const pending = useRef(null),
    latest = useRef(editor),
    latest_memory = useRef(memory),
    context = useRef("");
  useLayoutEffect(() => {
    latest.current = editor;
    latest_memory.current = memory;
  }, [editor, memory]);
  const append = (entry) =>
    set_entries((items) => [...items, entry].slice(-12));
  const cancel = () => {
    pending.current?.abort();
    pending.current = null;
    set_phase("idle");
    set_error("planner_cancelled");
  };
  useEffect(
    () => () => {
      pending.current?.abort();
      pending.current = null;
    },
    [],
  );
  // Adjust local presentation together with a changed editor result. Commit-time
  // validation owns success; an async dispatch alone never means Applied.
  if (acknowledged !== editor.proposal_result) {
    set_acknowledged(editor.proposal_result);
    const result = editor.proposal_result;
    if (proposal && result?.id === proposal.plan.proposal_id) {
      if (!result.applied) set_error(result.error);
      else {
        set_last_applied({
          brief: proposal.brief,
          summary: proposal.plan.summary,
          assumptions: proposal.plan.assumptions,
        });
        set_proposal(null);
        set_previewing(false);
        append({ role: "status", text: "planner_applied" });
      }
    }
  }
  useLayoutEffect(() => {
    if (editor.proposal_result?.applied) context.current = "";
  }, [editor.proposal_result]);
  const current_id = editor.history.present.id;
  if (document_id !== current_id) {
    set_document_id(current_id);
    set_phase("idle");
    set_entries([]);
    set_proposal(null);
    set_previewing(false);
    set_error(null);
    set_last_applied(null);
  }
  useLayoutEffect(() => {
    pending.current?.abort();
    pending.current = null;
    context.current = "";
  }, [current_id]);
  if (memory_signature !== current_memory) {
    set_memory_signature(current_memory);
    set_proposal(null);
    set_previewing(false);
    set_phase("idle");
    set_error("memory_changed");
  }
  useLayoutEffect(() => {
    pending.current?.abort();
    pending.current = null;
  }, [current_memory]);
  const stale =
    !!proposal &&
    proposal.base_json !==
      (() => {
        try {
          return component_document_json(editor.history.present);
        } catch {
          return "";
        }
      })();
  const run = async (kind, operation) => {
    if (pending.current || latest.current.busy) return false;
    const controller = new AbortController();
    pending.current = controller;
    set_phase(kind);
    set_error(null);
    try {
      await operation(controller.signal);
      return true;
    } catch (failure) {
      if (!controller.signal.aborted) set_error(failure.message);
      return false;
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        set_phase("idle");
      }
    }
  };
  return {
    phase,
    last_applied,
    entries,
    proposal,
    stale,
    error,
    previewing: previewing && !stale,
    preview: previewing && !stale ? proposal?.document : null,
    cancel,
    toggle_preview: () => set_previewing((value) => !value),
    dismiss() {
      set_proposal(null);
      set_previewing(false);
      context.current = "";
      set_error(null);
    },
    submit(value) {
      return run("planning", async (signal) => {
        const text = value.trim();
        const brief = context.current
          ? `${context.current}\nFollow-up: ${text}`
          : text;
        if (
          !text ||
          brief.length > 1000 ||
          new TextEncoder().encode(brief).length > 2048
        )
          throw new Error("planner_limit");
        const base = structuredClone(latest.current.history.present);
        component_document_json(base);
        const memory_json = JSON.stringify(latest_memory.current);
        const selected = select_construction_patterns(
          latest_memory.current,
          brief,
        );
        set_proposal(null);
        set_previewing(false);
        append({ role: "user", text });
        context.current = brief;
        const plan = await request(brief, base, signal, selected.guidance);
        signal.throwIfAborted();
        if (memory_json !== JSON.stringify(latest_memory.current))
          throw new Error("memory_changed");
        set_phase("preparing");
        const prepared = await prepare_component_proposal(
          plan,
          base,
          resolve,
          signal,
        );
        signal.throwIfAborted();
        if (
          component_document_json(latest.current.history.present) !==
          prepared.base_json
        )
          throw new Error("proposal_stale");
        set_proposal({
          ...prepared,
          brief,
          memory_json,
          patterns: selected.patterns.map(({ id, title, kind, revision }) => ({
            id,
            title,
            kind,
            revision,
          })),
        });
        append({ role: "assistant", text: plan.summary });
        set_previewing(plan.commands.length > 0);
      });
    },
    apply() {
      return run("applying", async (signal) => {
        if (!proposal || !proposal.plan.commands.length)
          throw new Error("proposal_invalid");
        const base = latest.current.history.present;
        if (component_document_json(base) !== proposal.base_json)
          throw new Error("proposal_stale");
        const materials = await resolve(
          proposal_references(proposal.plan, base),
          signal,
        );
        signal.throwIfAborted();
        if (latest.current.busy) throw new Error("proposal_stale");
        if (proposal.memory_json !== JSON.stringify(latest_memory.current))
          throw new Error("memory_changed");
        replay_component_proposal(
          proposal.plan,
          latest.current.history.present,
          materials,
        );
        latest.current.apply_proposal(proposal.plan, materials);
      });
    },
  };
}
