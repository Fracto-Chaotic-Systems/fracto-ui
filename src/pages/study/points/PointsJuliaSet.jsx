import React from "react";
import AppText from "../../../AppText.jsx";
import { POINTS_ORBITAL_TEXT } from "../../../text/StudyText.jsx";
import PointsJuliaCanvas from "./PointsJuliaCanvas.jsx";
import { SEED_SURVEY_DISCOVERY_OPTIONS } from "../../assets/surveys/SeedSurveyScan.js";
import { selected_core_point } from "./PointsStoredOrbitals.jsx";
import { build_orbital_trace_request } from "./PointsOrbitalTraceRequest.js";

const CANVAS_SIZE_PX = 500;
const JULIA_SCOPE = 4.0;

/** Use Detect's canvas, batching, and painting for the selected Julia parameter. */
export default function PointsJuliaSet({ selected_minibrot, selected_orbital, active_point_index, animation_playing }) {
  let focal_point;
  let core;
  try {
    core = selected_core_point(selected_minibrot);
    focal_point = { x: Number(core.x), y: Number(core.y) };
  } catch {
    return null;
  }

  return (
    <div style={{ width: CANVAS_SIZE_PX, marginRight: "auto", textAlign: "left" }}>
      <PointsJuliaCanvas
        key={`${focal_point.x},${focal_point.y}`}
        selected_orbital={selected_orbital}
        active_point_index={active_point_index}
        animation_playing={animation_playing}
        trace_request={build_orbital_trace_request(core, selected_orbital)}
        focal_point={focal_point}
        size_px={CANVAS_SIZE_PX}
        source_size_px={CANVAS_SIZE_PX}
        half_span={JULIA_SCOPE / 2}
        iteration_limit={SEED_SURVEY_DISCOVERY_OPTIONS.iteration_limit}
        aria_label={AppText.get(POINTS_ORBITAL_TEXT.julia_canvas)}
      />
    </div>
  );
}
