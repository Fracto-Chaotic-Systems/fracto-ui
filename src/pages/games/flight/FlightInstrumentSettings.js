export const FLIGHT_INSTRUMENT_CODES = Object.freeze([
  "airspeed",
  "attitude",
  "heading",
  "altitude",
  "vertical_speed",
  "turn",
]);
export const INSTRUMENT_SIZES = Object.freeze({
  small: 80,
  medium: 112,
  large: 144,
});
export const DEFAULT_INSTRUMENT_SETTINGS = Object.freeze({
  visible: true,
  size: "medium",
  speed_unit: "knots",
  pressure_unit: "hPa",
  speed_max_knots: 200,
  pitch_limit_deg: 40,
  vertical_speed_max_fpm: 2000,
  animation_ms: 0,
  placements: Object.freeze({
    airspeed: "left",
    attitude: "left",
    heading: "left",
    altitude: "right",
    vertical_speed: "right",
    turn: "right",
  }),
});

const bounded = (value, fallback, min, max) =>
  Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
const choice = (value, options, fallback) =>
  options.includes(value) ? value : fallback;

export function normalize_instrument_settings(value) {
  const defaults = DEFAULT_INSTRUMENT_SETTINGS;
  return {
    visible:
      typeof value?.visible === "boolean" ? value.visible : defaults.visible,
    size: choice(value?.size, Object.keys(INSTRUMENT_SIZES), defaults.size),
    speed_unit: choice(
      value?.speed_unit,
      ["knots", "kmh", "mps"],
      defaults.speed_unit,
    ),
    pressure_unit: choice(
      value?.pressure_unit,
      ["hPa", "inHg"],
      defaults.pressure_unit,
    ),
    speed_max_knots: bounded(
      value?.speed_max_knots,
      defaults.speed_max_knots,
      20,
      1000,
    ),
    pitch_limit_deg: bounded(
      value?.pitch_limit_deg,
      defaults.pitch_limit_deg,
      10,
      90,
    ),
    vertical_speed_max_fpm: bounded(
      value?.vertical_speed_max_fpm,
      defaults.vertical_speed_max_fpm,
      500,
      10000,
    ),
    animation_ms: bounded(value?.animation_ms, defaults.animation_ms, 0, 1000),
    placements: Object.fromEntries(
      FLIGHT_INSTRUMENT_CODES.map((code) => [
        code,
        choice(
          value?.placements?.[code],
          ["left", "right", "hidden"],
          defaults.placements[code],
        ),
      ]),
    ),
  };
}

export const speed_from_knots = (value, unit) =>
  value * (unit === "kmh" ? 1.852 : unit === "mps" ? 1852 / 3600 : 1);
export const speed_to_knots = (value, unit) =>
  value / speed_from_knots(1, unit);

export function instrument_codes(settings, side) {
  return settings.visible
    ? FLIGHT_INSTRUMENT_CODES.filter(
        (code) => settings.placements[code] === side,
      )
    : [];
}
