export const DEFAULT_FLIGHT_HAZE_PERCENT = 25;

export const normalize_flight_haze = (value) =>
  Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

/** Squared-distance fog; quartic control keeps nearby detail clear at light settings. */
export const flight_haze_density = (percent) =>
  4 * (normalize_flight_haze(percent) / 100) ** 4;

/** Slant distance / altitude from the ray itself, stable even at extreme zoom. */
export function flight_haze_transmission(projection, x, y, density) {
  const horizontal =
    (x + 0.5 - projection.width_px / 2) * projection.pixel_step;
  const vertical = (projection.height_px / 2 - y - 0.5) * projection.pixel_step;
  const weight = 1 - projection.lens_curve * (horizontal ** 2 + vertical ** 2);
  const downward = -(
    weight * projection.forward.up +
    horizontal * projection.right.up +
    vertical * projection.up.up
  );
  if (downward <= 0) return 0;
  const distance_squared =
    (weight * weight + horizontal * horizontal + vertical * vertical) /
    (downward * downward);
  return Math.exp(-density * distance_squared);
}
