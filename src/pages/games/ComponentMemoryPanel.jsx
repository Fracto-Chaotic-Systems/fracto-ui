import { useState } from "react";
import ComponentMemoryForm from "./ComponentMemoryForm.jsx";
import { memory_text as text } from "./ComponentMemoryText.js";
export default function ComponentMemoryPanel({
  memory,
  planner,
  brief,
  disabled,
}) {
  const [draft, set_draft] = useState(null),
    [open, set_open] = useState(false),
    [deleting, set_deleting] = useState(null);
  const create = (kind, instructions) => {
    set_draft({
      id: crypto.randomUUID(),
      revision: 0,
      kind,
      title: "",
      instructions,
      keywords: [],
      enabled: true,
    });
    set_open(true);
    set_deleting(null);
  };
  const library = memory.library;
  const remembered = brief.trim()
    ? brief
    : planner.entries.filter((entry) => entry.role === "user").at(-1)?.text ||
      "";
  return (
    <div>
      <button
        disabled={disabled || !library || !remembered.trim()}
        onClick={() => create("preference", remembered)}
      >
        {text("remember")}
      </button>{" "}
      <button
        disabled={disabled || !library || !planner.last_applied}
        onClick={() => {
          const source = planner.last_applied;
          create(
            "recipe",
            `${source.brief}\n${source.summary}${source.assumptions.length ? `\n${source.assumptions.join("\n")}` : ""}`,
          );
        }}
      >
        {text("save_recipe")}
      </button>
      <details
        open={open}
        onToggle={(event) => set_open(event.currentTarget.open)}
      >
        <summary>
          {text("title")} ({library?.patterns.length || 0})
        </summary>
        <p>{text("ownership")}</p>
        <p>{text("limits")}</p>
        {memory.error && <p role="alert">{text(memory.error)}</p>}
        {library && (
          <button disabled={disabled} onClick={() => create("preference", "")}>
            {text("new")}
          </button>
        )}
        {draft && (
          <ComponentMemoryForm
            key={`${draft.id}:${draft.revision}`}
            initial={draft}
            disabled={disabled}
            on_cancel={() => set_draft(null)}
            on_save={(pattern, revision) => {
              if (memory.save(pattern, revision)) set_draft(null);
            }}
          />
        )}
        {!library?.patterns.length && <p>{text("empty")}</p>}
        {library?.patterns.map((pattern) => (
          <details key={pattern.id}>
            <summary>
              {pattern.title} — {text(pattern.kind)} (
              {text(pattern.enabled ? "on" : "off")})
            </summary>
            <p data-memory-instructions>{pattern.instructions}</p>
            <p>
              {text("applies")}:{" "}
              {pattern.keywords.join(", ") || text("every_request")}
            </p>
            <button disabled={disabled} onClick={() => memory.toggle(pattern)}>
              {text(pattern.enabled ? "disable" : "enable")}
            </button>{" "}
            <button
              disabled={disabled}
              onClick={() => {
                set_draft(pattern);
                set_deleting(null);
              }}
            >
              {text("edit")}
            </button>{" "}
            <button disabled={disabled} onClick={() => set_deleting(pattern)}>
              {text("delete")}
            </button>
          </details>
        ))}
        {!library && (
          <button disabled={disabled} onClick={() => set_deleting("all")}>
            {text("reset")}
          </button>
        )}
        {deleting && (
          <div role="alert">
            <p>
              {text("delete_confirm")}
              {deleting !== "all" && ` ${deleting.title}`}
            </p>
            <button
              disabled={disabled}
              onClick={() => {
                if (
                  deleting === "all" ? memory.reset() : memory.remove(deleting)
                ) {
                  set_deleting(null);
                  set_draft(null);
                }
              }}
            >
              {text("confirm_delete")}
            </button>{" "}
            <button disabled={disabled} onClick={() => set_deleting(null)}>
              {text("cancel")}
            </button>
          </div>
        )}
      </details>
    </div>
  );
}
