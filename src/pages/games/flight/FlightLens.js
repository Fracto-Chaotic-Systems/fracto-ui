export const DEFAULT_FLIGHT_FISHEYE_STRENGTH = 0.35;
export const MAX_FLIGHT_FISHEYE_STRENGTH = 64;

export function normalize_fisheye_strength(value, legacy_enabled = true) {
  return Number.isFinite(value) && value >= 0
    ? Math.min(MAX_FLIGHT_FISHEYE_STRENGTH, value)
    : legacy_enabled === false
      ? 0
      : DEFAULT_FLIGHT_FISHEYE_STRENGTH;
}

// Cubic travel gives the mild end enough room while reaching extreme distortion.
export const fisheye_slider_value = (strength) =>
  100 *
  Math.cbrt(normalize_fisheye_strength(strength) / MAX_FLIGHT_FISHEYE_STRENGTH);
export const fisheye_strength_for_slider = (value) =>
  MAX_FLIGHT_FISHEYE_STRENGTH *
  (Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)) / 100) ** 3;
