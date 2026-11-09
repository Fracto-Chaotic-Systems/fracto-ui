import React from "react";
import styled from "styled-components";
import AppText from "../../../AppText.jsx";
import { POINTS_ORBITAL_TEXT } from "../../../text/StudyText.jsx";
import { render_pattern_block } from "../StudyUtils.jsx";

const Panel = styled.div`
  padding: 0.5rem;
  font-size: 0.8rem;
  p {
    margin: 0.5rem 0;
  }
  progress {
    display: block;
    width: 100%;
    height: 0.8rem;
    accent-color: #286090;
    margin: 0.5rem 0;
  }
  min-width: 0;
  .orbital-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .orbital-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    min-width: 0;
    padding: 0.2rem;
    border: 0;
    border-bottom: 1px solid #ddd;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .orbital-row[aria-pressed="true"] {
    background: #e4eef6;
  }
  .orbital-row:focus-visible {
    outline: 2px solid #286090;
    outline-offset: -2px;
  }
  .orbital-pattern {
    flex: 0 0 auto;
  }
  .orbital-ratios {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  a {
    color: #286090;
    text-decoration: underline;
    cursor: pointer;
  }
`;
const text = (key) => AppText.get(POINTS_ORBITAL_TEXT[key]);
const action = (label, on_click) => (
  <a
    href="#orbital-points"
    onClick={(event) => {
      event.preventDefault();
      on_click();
    }}
  >
    {text(label)}
  </a>
);

const format = (key, values) =>
  Object.entries(values).reduce(
    (label, [name, value]) => label.replaceAll(`{${name}}`, String(value)),
    text(key),
  );

// Percentages describe the current stage/search, rather than estimated elapsed time.
const calculation_progress = (progress = {}) => {
  if (progress.stage === "queued" || progress.job_status === "queued")
    return { label: text("queued") };
  if (progress.stage === "persisting") {
    if (progress.phase === "rays") return { label: text("saving_rays") };
    return {
      label: text("saving"),
      value: progress.orbital_count,
      total: progress.expected_orbitals,
      description: format("saving_progress", {
        processed: progress.orbital_count ?? 0,
        total: progress.expected_orbitals ?? 0,
      }),
    };
  }
  if (progress.stage === "calculating_rays" || progress.phase === "rays") {
    const completed = progress.ray_orbitals_processed ?? 0;
    const total = progress.ray_orbitals_total ?? 0;
    const searching =
      progress.phase === "rays" && progress.ray_families_total > 1;
    return {
      label: text("ray_stage"),
      value: searching ? progress.ray_families_processed : undefined,
      total: searching ? progress.ray_families_total : undefined,
      description: format(searching ? "ray_progress" : "ray_preparing", {
        processed: completed,
        total,
        current: Math.min(completed + 1, total),
        families: progress.ray_families_processed ?? 0,
        family_limit: progress.ray_families_total ?? 0,
      }),
    };
  }
  if (progress.phase === "survey" || progress.phase === "scan") {
    const survey = progress.phase === "survey";
    const value = survey ? progress.survey_processed : progress.scan_processed;
    const total = survey ? progress.survey_total : progress.scan_total;
    return {
      label: text(survey ? "survey_stage" : "scan_stage"),
      value,
      total,
      description: format(survey ? "survey_progress" : "scan_progress", {
        processed: value ?? 0,
        total: total ?? 0,
      }),
    };
  }
  return {
    label: text(progress.stage === "discovering" ? "queued" : "calculating"),
  };
};

export default function PointsStoredOrbitalsView({
  status,
  orbitals,
  selected_orbital: selection,
  on_select_orbital,
  error_kind,
  notice,
  stale = false,
  resumable = false,
  job_id,
  progress,
  on_calculate,
  on_cancel,
  on_reload,
}) {
  const selected_orbital = selection || orbitals[0];
  const metric = calculation_progress(progress || {});
  const determinate = Number.isFinite(metric.total) && metric.total > 0;
  const value = Math.min(
    metric.total,
    Math.max(0, Number.isFinite(metric.value) ? metric.value : 0),
  );
  const percent = determinate ? Math.floor((100 * value) / metric.total) : null;
  return (
    <Panel>
      <div role="status" aria-live="polite">
        {status === "idle" && <p>{text("select")}</p>}
        {status === "loading" && <p>{text("loading")}</p>}
        {status === "calculating" && (
          <>
            <p>
              <strong>
                {metric.label}
                {percent !== null ? ` · ${percent}%` : ""}
              </strong>
            </p>
            <progress
              aria-label={metric.label}
              aria-valuetext={metric.description || metric.label}
              max={determinate ? metric.total : 1}
              value={determinate ? value : undefined}
            />
            {metric.description && <p>{metric.description}</p>}
          </>
        )}
        {notice === "partial" && <p>{text("partial")}</p>}
        {status === "error" && (
          <p>
            {text(
              error_kind === "core"
                ? "invalid_core"
                : error_kind === "calculate"
                  ? "calculate_error"
                  : "load_error",
            )}
          </p>
        )}
      </div>
      {status === "calculating" && job_id && (
        <p>{action("cancel", on_cancel)}</p>
      )}
      {resumable && status !== "calculating" && (
        <>
          <p>{text("resume_notice")}</p>
          <p>{action("resume", on_calculate)}</p>
        </>
      )}
      {status === "error" && error_kind !== "core" && (
        <p>{action("reload", on_reload)}</p>
      )}
      {!resumable &&
        ((status === "ready" && !orbitals.length) ||
          (status === "error" && error_kind === "calculate")) && (
          <>
            <p>{text(stale ? "stale" : "empty")}</p>
            <p>{action(stale ? "recalculate" : "calculate", on_calculate)}</p>
          </>
        )}
      <ul className="orbital-list">
        {orbitals.map((orbital) => {
          const ratios = orbital.points
            .map(
              (point) =>
                point.landing_ratios
                  .map((ratio) => `${ratio.numerator}/${ratio.denominator}`)
                  .join(", ") || "—",
            )
            .join("; ");
          return (
            <li key={orbital.orbital_id}>
              <button
                type="button"
                className="orbital-row"
                aria-pressed={orbital === selected_orbital}
                onClick={() => on_select_orbital?.(orbital)}
              >
                <span className="orbital-pattern">
                  {render_pattern_block(orbital.period, 16, true)}
                </span>
                <span className="orbital-ratios" title={ratios}>
                  {ratios}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
