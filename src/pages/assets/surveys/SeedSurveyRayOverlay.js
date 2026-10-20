import FractoUtil from "@fracto/sdk/FractoUtil.js";
import { paint_canvas_rays } from "../../../utils/render/FractoRayOverlay.js";
export { ray_label_position } from "../../../utils/render/FractoRayOverlay.js";

export const paint_survey_rays = (
  context,
  canvas,
  rays,
  half_span,
  cardinality = 0,
) =>
  paint_canvas_rays(
    context,
    canvas,
    rays,
    half_span,
    FractoUtil.fracto_pattern_color(cardinality),
  );
