/** Shared Detect/Julia orbital markers in the seed plane, imaginary axis upward. */
export const paint_survey_orbital_points = (context, canvas, points, half_span) => {
  context.save();
  context.fillStyle = "#ffffff";
  context.strokeStyle = "#000000";
  context.lineWidth = 1;
  for (const point of points) {
    const re = Number(point.x ?? point.re);
    const im = Number(point.y ?? point.im);
    if (!Number.isFinite(re) || !Number.isFinite(im)) continue;
    const x = ((re + half_span) / (2 * half_span)) * canvas.width;
    const y = ((half_span - im) / (2 * half_span)) * canvas.height;
    context.beginPath();
    context.arc(x, y, 1.5, 0, 2 * Math.PI);
    context.fill();
    context.strokeRect(x - 3, y - 3, 6, 6);
  }
  context.restore();
};
