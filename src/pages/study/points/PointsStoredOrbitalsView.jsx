import React from "react";
import styled from "styled-components";
import AppText from "../../../AppText.jsx";
import { POINTS_ORBITAL_TEXT } from "../../../text/StudyText.jsx";
import { render_pattern_block } from "../StudyUtils.jsx";
import {
  orbital_selectable,
  orbital_ratio_label,
} from "./PointsOrbitalState.js";

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
  .denominator-coverage {
    border-top: 1px solid #ddd;
    margin-top: 0.5rem;
    padding-bottom: 0.5rem;
    overflow-wrap: anywhere;
  }
  .coverage-details {
    max-height: 14rem;
    overflow: auto;
  }
  .coverage-details table {
    width: 100%;
    border-collapse: collapse;
  }
  .coverage-details th,
  .coverage-details td {
    text-align: left;
    padding: 0.2rem;
  }
  summary {
    cursor: pointer;
  }
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
  .orbital-row:disabled {
    opacity: 0.55;
    cursor: default;
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
  if (
    progress.phase === "catalog" &&
    progress.catalog_confirmation_retry_total >
      (progress.catalog_confirmation_retries || 0)
  )
    return {
      label: text("confirmation_retry_stage"),
      value: progress.catalog_confirmation_retries || 0,
      total: progress.catalog_confirmation_retry_total,
      description: format("confirmation_retry_progress", {
        processed: progress.catalog_confirmation_retries || 0,
        total: progress.catalog_confirmation_retry_total,
      }),
    };
  if (progress.phase === "catalog")
    return {
      label: text("catalog_stage"),
      value: progress.catalog_processed,
      total: progress.catalog_total,
      description: format("catalog_progress", {
        processed: progress.catalog_processed ?? 0,
        total: progress.catalog_total ?? 0,
      }),
    };
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
  coverage,
  discovery_strategy,
  confirmation_repair_available,
  on_calculate,
  on_cancel,
  on_reload,
}) {
  const selected_orbital = orbital_selectable(selection)
    ? selection
    : orbitals.find(orbital_selectable);
  const catalog_only = discovery_strategy === "catalog-representative-rays-v1";
  const report = progress?.catalog_coverage || coverage;
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
            {catalog_only && (
              <p>
                {format("catalog_results", {
                  orbitals: progress?.orbital_count ?? orbitals.length,
                  verified: progress?.catalog_accepted ?? 0,
                  unresolved: progress?.catalog_unresolved ?? 0,
                  cached: progress?.catalog_cache_hits ?? 0,
                })}
              </p>
            )}
            {catalog_only && <p>{text("paths_on_selection")}</p>}
          </>
        )}
        {notice === "partial" && (
          <p>{text(catalog_only ? "catalog_partial" : "partial")}</p>
        )}
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
      {report && (
        <section
          className="denominator-coverage"
          aria-label={format("coverage_title", {
            bound: report.max_denominator,
          })}
        >
          <p>
            <strong>
              {format("coverage_title", { bound: report.max_denominator })}
            </strong>
          </p>
          <p>
            {report.tested_through_denominator > 0
              ? format("coverage_range", {
                  denominator: report.tested_through_denominator,
                })
              : text("coverage_none")}
          </p>
          <p>
            {format("coverage_counts", {
              investigated: report.investigated_families,
              total: report.total_families,
              validated: report.validated_families,
              unresolved: report.unresolved_families,
              untested: report.uninvestigated_families,
              cached: report.cache_hits,
            })}
          </p>
          <details>
            <summary>{text("coverage_details")}</summary>
            <div className="coverage-details">
              <table>
                <thead>
                  <tr>
                    <th scope="col">{text("coverage_denominator")}</th>
                    <th scope="col">{text("coverage_investigated")}</th>
                    <th scope="col">{text("coverage_periods")}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.denominators.map((entry) => (
                    <tr key={entry.denominator}>
                      <td>{entry.denominator}</td>
                      <td>
                        {entry.investigated_families} / {entry.total_families}
                      </td>
                      <td>{entry.candidate_orbital_periods.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!!report.unresolved_details?.length && (
                <>
                  <p>
                    <strong>{text("coverage_unresolved")}</strong>
                  </p>
                  <ul>
                    {report.unresolved_details.map((family) => (
                      <li key={family.family_key}>
                        {family.family_key}:{" "}
                        {family.reason.replaceAll("_", " ")}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </details>
          <p>{text("coverage_scope")}</p>
        </section>
      )}
      {!report && status === "ready" && orbitals.length > 0 && (
        <p>{text("coverage_unknown")}</p>
      )}
      {status === "calculating" && job_id && (
        <p>{action("cancel", on_cancel)}</p>
      )}
      {resumable && status !== "calculating" && (
        <>
          <p>
            {text(
              confirmation_repair_available
                ? "confirmation_repair_notice"
                : catalog_only
                  ? "catalog_resume_notice"
                  : "resume_notice",
            )}
          </p>
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
            <p>{text("catalog_intro")}</p>
            <p>{action(stale ? "recalculate" : "calculate", on_calculate)}</p>
          </>
        )}
      <ul className="orbital-list">
        {orbitals.map((orbital) => {
          const has_ratios = orbital.points.some(
            (point) => point.landing_ratios?.length,
          );
          const ratios = has_ratios
            ? orbital.points
                .map(
                  (point) =>
                    (point.landing_ratios || [])
                      .map((ratio) => `${ratio.numerator}/${ratio.denominator}`)
                      .join(", ") || "—",
                )
                .join("; ")
            : text(orbital_ratio_label(orbital));
          return (
            <li key={orbital.orbital_id}>
              <button
                type="button"
                className="orbital-row"
                aria-pressed={orbital === selected_orbital}
                disabled={!orbital_selectable(orbital)}
                title={text(
                  orbital_selectable(orbital)
                    ? "orbital_available"
                    : "orbital_pending",
                )}
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
