import React from "react";
import AppText from "../../../AppText.jsx";
import { POINTS_ORBITAL_TEXT } from "../../../text/StudyText.jsx";

const text = (key) => AppText.get(POINTS_ORBITAL_TEXT[key]);

/** Keep cache lookup, active tracing, and terminal outcomes distinct. */
export default function PointsOrbitalRayProgress({
  running,
  loading_cache,
  cache_error,
  processed,
  total,
  status,
  on_cancel,
  on_retry,
}) {
  const progress = text("known_ray_progress")
    .replace("{processed}", processed)
    .replace("{total}", total);
  const retry = !running && ["failed", "partial", "cancelled"].includes(status);
  const message = loading_cache
    ? text("known_ray_cache_loading")
    : running
      ? progress
      : status === "cancelled"
        ? text("known_ray_cancelled")
        : status === "failed"
          ? text("known_ray_failed")
          : status && status !== "rays_found"
            ? text("known_ray_unresolved")
            : null;
  if (!message && !cache_error) return null;
  return (
    <div
      style={{ width: "500px", marginLeft: "0.25rem", fontSize: "0.8rem" }}
      role="status"
      aria-live="polite"
    >
      {message && <div>{message}</div>}
      {running && !loading_cache && (
        <>
          <progress
            aria-label={text("known_ray_loading")}
            aria-valuetext={progress}
            max={Math.max(1, total)}
            value={processed}
            style={{ display: "block", width: "100%" }}
          />
          <button type="button" onClick={on_cancel}>
            {text("known_ray_cancel")}
          </button>
        </>
      )}
      {retry && (
        <button type="button" onClick={on_retry}>
          {text("known_ray_retry")}
        </button>
      )}
      {cache_error && <div>{text("known_ray_cache_failed")}</div>}
    </div>
  );
}
