import React from "react";
import styled from "styled-components";
import AppText from "../../../AppText.jsx";
import { POINTS_ORBITAL_TEXT } from "../../../text/StudyText.jsx";

const Panel = styled.div`
  padding: 0.5rem;
  font-size: 0.8rem;
  h3 {
    margin: 0 0 0.5rem;
    font-size: 0.9rem;
  }
  p {
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

export default function PointsStoredOrbitalsView({
  status,
  orbitals,
  focal_point,
  error_kind,
  notice,
  stale = false,
  progress,
  on_calculate,
  on_reload,
}) {
  return (
    <Panel>
      <h3>{text("title")}</h3>
      {focal_point && (
        <p>
          {text("core")}:{" "}
          <code>
            ({focal_point.x}, {focal_point.y})
          </code>
        </p>
      )}
      <div role="status" aria-live="polite">
        {status === "idle" && <p>{text("select")}</p>}
        {status === "loading" && <p>{text("loading")}</p>}
        {status === "calculating" && <p>{text("calculating")}</p>}
        {status === "calculating" && progress?.phase && (
          <p>
            {text(
              progress.phase === "survey"
                ? "survey_progress"
                : progress.phase === "scan"
                  ? "scan_progress"
                  : "ray_progress",
            )
              .replace(
                "{processed}",
                progress.phase === "survey"
                  ? (progress.survey_processed ?? 0)
                  : progress.phase === "scan"
                    ? (progress.scan_processed ?? 0)
                    : (progress.ray_orbitals_processed ?? 0),
              )
              .replace(
                "{total}",
                progress.phase === "survey"
                  ? (progress.survey_total ?? 0)
                  : progress.phase === "scan"
                    ? (progress.scan_total ?? 0)
                    : (progress.ray_orbitals_total ?? 0),
              )
              .replace("{families}", progress.ray_families_processed ?? 0)
              .replace("{family_limit}", progress.ray_families_total ?? 0)}
          </p>
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
      {status === "error" && error_kind !== "core" && (
        <p>{action("reload", on_reload)}</p>
      )}
      {((status === "ready" && !orbitals.length) ||
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
