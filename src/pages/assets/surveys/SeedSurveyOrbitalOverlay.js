/** Shared Detect/Julia orbital markers in the seed plane, imaginary axis upward. */
export const paint_survey_orbital_points = (context, canvas, points, half_span, active_point_index = -1, selected_point_index = -1) => {
  context.save();
  context.globalAlpha = 1;
  context.fillStyle = "#ffffff";
  context.strokeStyle = "#000000";
  context.lineWidth = 1;
  for (const [index, point] of points.entries()) {
    const re = Number(point.x ?? point.re);
    const im = Number(point.y ?? point.im);
    if (!Number.isFinite(re) || !Number.isFinite(im)) continue;
    const x = ((re + half_span) / (2 * half_span)) * canvas.width;
    const y = ((half_span - im) / (2 * half_span)) * canvas.height;
    context.beginPath();
    context.arc(x, y, 1.5, 0, 2 * Math.PI);
    context.fill();
    const size = index === active_point_index ? 10 : 6;
    context.fillRect(x - size / 2, y - size / 2, size, size);
    context.strokeStyle = index === selected_point_index ? "#ffcc33" : "#000000";
    context.lineWidth = index === selected_point_index ? 2 : 1;
    context.strokeRect(x - size / 2, y - size / 2, size, size);
  }
  context.restore();
};
