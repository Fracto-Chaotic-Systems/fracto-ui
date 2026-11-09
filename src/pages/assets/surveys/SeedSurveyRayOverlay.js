import FractoUtil from "@fracto/sdk/FractoUtil.js";
import { paint_canvas_rays } from "../../../utils/render/FractoRayOverlay.js";
export { ray_label_position } from "../../../utils/render/FractoRayOverlay.js";

export const paint_survey_rays = (
  context,
  canvas,
  rays,
  half_span,
  cardinality = 0,
  active_point_index = null,
  point_opacities = null,
) => {
  const [hue, saturation, lightness] =
    FractoUtil.fracto_pattern_color_hsl(cardinality);
  const paint = (subset) => paint_canvas_rays(
    context,
    canvas,
    subset,
    half_span,
    `hsl(${hue}, ${saturation}%, ${Math.min(100, lightness + 14)}%)`,
    true,
    1.6,
    "#555555",
  );
  if (point_opacities) {
    for (const [point_index, opacity] of point_opacities) {
      if (opacity <= 0) continue;
      context.save();
      context.globalAlpha *= opacity;
      paint((rays || []).filter((ray) => ray.point_index === point_index));
      context.restore();
    }
    return;
  }
  if (!Number.isInteger(active_point_index) || active_point_index < 0) {
    paint(rays);
    return;
  }
  paint((rays || []).filter((ray) => ray.point_index === active_point_index));
};
