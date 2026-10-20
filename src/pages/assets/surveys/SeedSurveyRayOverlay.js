import FractoUtil from "@fracto/sdk/FractoUtil.js";

const LABEL_FONT = "12px monospace";
const LABEL_HEIGHT = 18;
const LABEL_PADDING_X = 4;
const LABEL_MARGIN = 6;
const canvas_point = (point, width, height, half_span) => ({
  x: ((point.x + half_span) / (2 * half_span)) * width,
  y: ((half_span - point.y) / (2 * half_span)) * height,
});

// Find the first visible segment entry into the rectangle that keeps the entire
// label inside the canvas. Segments may cross it even when both ends are outside.
export const ray_label_position = (
  points,
  width,
  height,
  half_span,
  text_width,
) => {
  const left = LABEL_MARGIN + LABEL_PADDING_X + text_width / 2;
  const right = width - left;
  const top = LABEL_MARGIN + LABEL_HEIGHT / 2;
  const bottom = height - top;
  if (left > right || top > bottom) return null;
  for (let i = 1; i < points.length; i++) {
    const a = canvas_point(points[i - 1], width, height, half_span);
    const b = canvas_point(points[i], width, height, half_span);
    if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) continue;
    let enter = 0,
      exit = 1;
    for (const [start, delta, low, high] of [
      [a.x, b.x - a.x, left, right],
      [a.y, b.y - a.y, top, bottom],
    ]) {
      if (delta === 0) {
        if (start < low || start > high) {
          exit = -1;
          break;
        }
      } else {
        const first = (low - start) / delta,
          second = (high - start) / delta;
        enter = Math.max(enter, Math.min(first, second));
        exit = Math.min(exit, Math.max(first, second));
      }
    }
    if (enter <= exit)
      return { x: a.x + (b.x - a.x) * enter, y: a.y + (b.y - a.y) * enter };
  }
  return null;
};

/** Dynamic-plane ray overlay; see RAYS.md and Milnor (2000), Appendix A. */
export const paint_survey_rays = (
  context,
  canvas,
  rays,
  half_span,
  cardinality = 0,
) => {
  if (!rays?.length) return;
  const ray_color = FractoUtil.fracto_pattern_color(cardinality);
  context.save();
  context.beginPath();
  context.rect(0, 0, canvas.width, canvas.height);
  context.clip();
  context.lineJoin = "round";
  for (const ray of rays) {
    if (!ray.points?.length) continue;
    context.beginPath();
    ray.points.forEach((point, index) => {
      const x = ((point.x + half_span) / (2 * half_span)) * canvas.width;
      const y = ((half_span - point.y) / (2 * half_span)) * canvas.height;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.strokeStyle = "#000000";
    context.lineWidth = 2;
    context.stroke();
    context.strokeStyle = ray_color;
    context.lineWidth = 1.25;
    context.stroke();
  }
  // Label after all strokes so another ray cannot paint over a fraction.
  context.font = LABEL_FONT;
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const ray of rays) {
    const label = ray.angle?.key;
    if (!label || !ray.points?.length) continue;
    const position = ray_label_position(
      ray.points,
      canvas.width,
      canvas.height,
      half_span,
      context.measureText(label).width,
    );
    if (!position) continue;
    const box_width = context.measureText(label).width + 2 * LABEL_PADDING_X;
    const box_x = position.x - box_width / 2;
    const box_y = position.y - LABEL_HEIGHT / 2;
    context.fillStyle = "#ffffff";
    context.fillRect(box_x, box_y, box_width, LABEL_HEIGHT);
    context.strokeStyle = "#000000";
    context.lineWidth = 1;
    context.strokeRect(box_x, box_y, box_width, LABEL_HEIGHT);
    context.fillStyle = "#000000";
    context.fillText(label, position.x, position.y);
  }
  context.restore();
};
