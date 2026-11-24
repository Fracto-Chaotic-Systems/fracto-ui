import { useState } from "react";
import AppText from "../../AppText.jsx";
import {
  COMPONENT_PLANNER_TEXT,
  CONSTRUCTION_MEMORY_TEXT,
} from "../../text/GamesText.jsx";
import { ConversationStyles } from "./ComponentConversationStyles.jsx";
import ComponentMemoryPanel from "./ComponentMemoryPanel.jsx";

export const planner_text = (key) =>
  AppText.get(
    CONSTRUCTION_MEMORY_TEXT[key] ||
      COMPONENT_PLANNER_TEXT[
        Object.hasOwn(COMPONENT_PLANNER_TEXT, key) ? key : "planner_unavailable"
      ],
  );
export default function ComponentConversation({ planner, disabled, memory }) {
  const [brief, set_brief] = useState("");
  const plan = planner.proposal?.plan,
    busy = planner.phase !== "idle";
  return (
    <ConversationStyles aria-label={planner_text("title")}>
      <h3>{planner_text("title")}</h3>
      <p>{planner_text("help")}</p>
      <ComponentMemoryPanel
        memory={memory}
        planner={planner}
        brief={brief}
        disabled={busy || disabled}
      />
      <div
        role="log"
        aria-live="polite"
        aria-label={planner_text("conversation")}
      >
        {planner.entries.map((entry, index) => (
          <p key={index}>
            <strong>{planner_text(entry.role)}: </strong>
            {entry.role === "status" ? planner_text(entry.text) : entry.text}
          </p>
        ))}
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (await planner.submit(brief)) set_brief("");
        }}
      >
        <label>
          {planner_text("brief")}
          <textarea
            rows={4}
            maxLength={1000}
            value={brief}
            disabled={busy || disabled}
            onChange={(event) => set_brief(event.target.value)}
          />
        </label>
        <button disabled={busy || disabled || !brief.trim()}>
          {planner_text("send")}
        </button>
      </form>
      {busy && (
        <div role="status">
          <p>{planner_text(planner.phase)}</p>
          <button onClick={planner.cancel}>{planner_text("cancel")}</button>
        </div>
      )}
      {planner.error && <p role="alert">{planner_text(planner.error)}</p>}
      {plan && (
        <div>
          {!!planner.proposal.patterns?.length && (
            <>
              <strong>{planner_text("supplied")}</strong>
              <ul>
                {planner.proposal.patterns.map((pattern) => (
                  <li key={pattern.id}>{pattern.title}</li>
                ))}
              </ul>
            </>
          )}
          <h4>{planner_text("proposal")}</h4>
          {planner.stale && (
            <p role="alert">{planner_text("proposal_stale")}</p>
          )}
          {!!plan.questions.length && (
            <>
              <strong>{planner_text("questions")}</strong>
              <ul>
                {plan.questions.map((value, index) => (
                  <li key={index}>{value}</li>
                ))}
              </ul>
            </>
          )}
          {!!plan.assumptions.length && (
            <>
              <strong>{planner_text("assumptions")}</strong>
              <ul>
                {plan.assumptions.map((value, index) => (
                  <li key={index}>{value}</li>
                ))}
              </ul>
            </>
          )}
          {!!plan.information_needed.length && (
            <>
              <strong>{planner_text("gaps")}</strong>
              <ul>
                {plan.information_needed.map((gap, index) => (
                  <li key={index}>
                    {gap.query}: {planner_text(gap.reason)}
                  </li>
                ))}
              </ul>
            </>
          )}
          {(plan.scene_limited || plan.catalog_limited) && (
            <p>{planner_text("limited")}</p>
          )}
          {plan.commands.length ? (
            <>
              <p>
                {planner_text("changes")}: {plan.commands.length}.{" "}
                {planner_text("instances")}: {plan.preview.total_instances}
              </p>
              <ul>
                {plan.commands.map((command, index) => (
                  <li key={index}>
                    {planner_text(command.type)}
                    {command.type === "set-floor" && command.floor
                      ? ` (${command.floor.size.join(" × ")} m)`
                      : command.type === "scatter"
                        ? ` (${command.rule.count})`
                        : ""}
                  </li>
                ))}
              </ul>
              <button
                disabled={busy || disabled || planner.stale}
                onClick={planner.toggle_preview}
              >
                {planner_text(
                  planner.previewing ? "show_draft" : "show_preview",
                )}
              </button>{" "}
              <button
                disabled={busy || disabled || planner.stale}
                onClick={() => void planner.apply()}
              >
                {planner_text("apply")}
              </button>
              <p>{planner_text("apply_help")}</p>
            </>
          ) : (
            <p>{planner_text("no_changes")}</p>
          )}
          {!!plan.catalog_matches.length && (
            <details>
              <summary>{planner_text("alternatives")}</summary>
              <ul>
                {plan.catalog_matches.map((match) => (
                  <li key={match.id}>
                    {match.name}{" "}
                    {match.placement_ready
                      ? ""
                      : `— ${planner_text("calibration_required")}`}{" "}
                    <button
                      disabled={busy || disabled}
                      onClick={() =>
                        set_brief(
                          planner_text("use_candidate").replace(
                            "{name}",
                            match.name,
                          ),
                        )
                      }
                    >
                      {planner_text("choose")}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <button disabled={busy} onClick={planner.dismiss}>
            {planner_text("dismiss")}
          </button>
        </div>
      )}
      {!plan && planner.entries.length > 0 && !busy && (
        <button onClick={planner.dismiss}>{planner_text("new_request")}</button>
      )}
    </ConversationStyles>
  );
}
