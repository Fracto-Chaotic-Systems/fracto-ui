/** Reserve a usable controls column inside the caller's actual width budget. */
export const circuitry_layout = (width_px, height_px) => {
  const width = Math.max(500, Number(width_px) || 500);
  const height = Math.max(0, Number(height_px) || 0);
  const margins = 32;
  const base_size = Math.max(0, Math.min(height * 0.85, width - 260 - margins));
  // Preserve the existing main-chart size in constrained panes, but use spare
  // width for both columns instead of imposing a fixed 85%-height ceiling.
  const chart_size = Math.floor(
    Math.min(
      height,
      Math.max(
        base_size,
        Math.min(width - 260 - margins, (width - margins) / 2),
      ),
    ),
  );

  const options_width = Math.min(
    width - chart_size - margins,
    Math.max(260, chart_size),
  );
  return {
    chart_size,
    options_width,
    distance_chart_width: options_width,
    distance_chart_height: Math.max(1, Math.floor(chart_size / 2)),
  };
};
