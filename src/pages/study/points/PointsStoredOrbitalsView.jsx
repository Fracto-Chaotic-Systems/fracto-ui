import React from "react";
import styled from "styled-components";
import AppText from "../../../AppText.jsx";
import { POINTS_ORBITAL_TEXT } from "../../../text/StudyText.jsx";

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
  details {
    padding: 0.4rem 0;
    border-top: 1px solid #ddd;
  }
  summary {
    cursor: pointer;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0.5rem;
  }
  th,
  td {
    text-align: left;
    vertical-align: top;
    padding: 0.25rem;
    border-bottom: 1px solid #eee;
  }
  code {
    overflow-wrap: anywhere;
    white-space: normal;
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
      {orbitals.map((orbital) => (
        <details key={orbital.orbital_id}>
          <summary>
            {text("summary")
              .replace("{id}", orbital.orbital_id)
              .replace("{period}", orbital.period)
              .replace(
                "{ratios}",
                orbital.points.reduce(
                  (n, point) => n + point.landing_ratios.length,
                  0,
                ),
              )}
          </summary>
          {orbital.discovery_metadata?.confidence != null && (
            <p>
              {text("confirmation")
                .replace(
                  "{confidence}",
                  (100 * orbital.discovery_metadata.confidence).toFixed(2),
                )
                .replace(
                  "{discoveries}",
                  orbital.discovery_metadata.discovery_count,
                )}
            </p>
          )}
          <table>
            <thead>
              <tr>
                <th>{text("point")}</th>
                <th>{text("real")}</th>
                <th>{text("imaginary")}</th>
                <th>{text("ratios")}</th>
              </tr>
            </thead>
            <tbody>
              {orbital.points.map((point) => (
                <tr key={point.point_index}>
                  <td>{point.point_index + 1}</td>
                  <td>
                    <code>{point.point.re}</code>
                  </td>
                  <td>
                    <code>{point.point.im}</code>
                  </td>
                  <td>
                    <code>
                      {point.landing_ratios
                        .map(
                          (ratio) => `${ratio.numerator}/${ratio.denominator}`,
                        )
                        .join(", ") || "—"}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ))}
    </Panel>
  );
}
