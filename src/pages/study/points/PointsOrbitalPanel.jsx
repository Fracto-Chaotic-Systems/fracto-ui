import React from "react";
import CircuitryChart from "../circuitry/CircuitryChart.jsx";
import PointsJuliaSet from "./PointsJuliaSet.jsx";
import { selected_core_point } from "./PointsStoredOrbitals.jsx";

const JULIA_WIDTH_PX = 504; // The 500px canvas plus its existing 4px inset.
const GAP_PX = 8;
const MIN_CIRCUITRY_WIDTH_PX = 500;
const HEIGHT_PX = 500;

/** Pair the fixed Julia image with the freeform orbital tab's shared circuitry. */
export default function PointsOrbitalPanel({
  selected_minibrot,
  selected_orbital,
  width_px,
  on_active_point_changed,
  active_point_index,
  animation_playing,
  point_selection_request,
}) {
  let focal_point;
  try {
    const core = selected_core_point(selected_minibrot);
    focal_point = { x: Number(core.x), y: Number(core.y) };
  } catch {
    return null;
  }
  let scope;
  try {
    const value = selected_minibrot.display_settings;
    const settings = typeof value === "string" ? JSON.parse(value) : value;
    const saved_scope = Number(settings?.scope);
    if (Number.isFinite(saved_scope) && saved_scope > 0) scope = saved_scope;
  } catch {
    /* The circuitry can still render without optional display bounds. */
  }
  const min_width = JULIA_WIDTH_PX + GAP_PX + MIN_CIRCUITRY_WIDTH_PX;
  const circuitry_width = Math.max(
    MIN_CIRCUITRY_WIDTH_PX,
    (Number(width_px) || min_width) - JULIA_WIDTH_PX - GAP_PX,
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: GAP_PX,
        width: "100%",
        minWidth: min_width,
      }}
    >
      <div style={{ flex: `0 0 ${JULIA_WIDTH_PX}px`, width: JULIA_WIDTH_PX }}>
        <PointsJuliaSet
          selected_minibrot={selected_minibrot}
          selected_orbital={selected_orbital}
          active_point_index={active_point_index}
          animation_playing={animation_playing}
        />
      </div>
      <div
        style={{
          flex: "1 1 0",
          minWidth: MIN_CIRCUITRY_WIDTH_PX,
          height: HEIGHT_PX,
          overflow: "auto",
        }}
      >
        <CircuitryChart
          key={`orbital:${selected_minibrot.id}:${JSON.stringify(selected_minibrot.core_point)}:${selected_minibrot.pattern}`}
          focal_point={focal_point}
          selected_orbital={selected_orbital || null}
          scope={scope}
          width_px={circuitry_width}
          height_px={HEIGHT_PX}
          on_active_point_changed={on_active_point_changed}
          point_selection_request={point_selection_request}
        />
      </div>
    </div>
  );
}
