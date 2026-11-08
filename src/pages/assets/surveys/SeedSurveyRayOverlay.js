import FractoUtil from "@fracto/sdk/FractoUtil.js";
import { paint_canvas_rays } from "../../../utils/render/FractoRayOverlay.js";
export { ray_label_position } from "../../../utils/render/FractoRayOverlay.js";

export const paint_survey_rays = (
  context,
  canvas,
  rays,
  half_span,
  cardinality = 0,
) => {
  const [hue, saturation, lightness] =
    FractoUtil.fracto_pattern_color_hsl(cardinality);
  paint_canvas_rays(
    context,
    canvas,
    rays,
    half_span,
    `hsl(${hue}, ${saturation}%, ${Math.min(100, lightness + 14)}%)`,
    true,
    1.6,
    "#555555",
  );
};
