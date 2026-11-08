import React from "react";
import FractoRasterImage from "../../../utils/render/FractoRasterImage.jsx";

export default function PointsSelectedPreview({
  selected_minibrot,
  width_px,
  height_px,
}) {
  let settings;
  try {
    const value = selected_minibrot?.display_settings;
    settings = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
  const focal_point = settings?.focal_point;
  const scope = Number(settings?.scope);
  const size = Math.floor(Math.min(width_px, height_px));
  if (
    !focal_point ||
    ![focal_point.x, focal_point.y].every(
      (value) =>
        value != null &&
        String(value).trim() !== "" &&
        Number.isFinite(Number(value)),
    ) ||
    !Number.isFinite(scope) ||
    scope <= 0 ||
    size <= 0
  )
    return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }}
    >
      <FractoRasterImage
        key={JSON.stringify([selected_minibrot.id, focal_point, scope, size])}
        width_px={size}
        focal_point={focal_point}
        scope={scope}
      />
    </div>
  );
}
