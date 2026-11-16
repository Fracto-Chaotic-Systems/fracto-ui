import {
  DEFAULT_INSTRUMENT_SETTINGS,
  speed_from_knots,
} from "./FlightInstrumentSettings.js";

export const HPA_PER_INHG = 33.8638866667;

// Package-specific prop names stay out of the flight-state contract.
export function flight_instrument_props(
  code,
  state,
  settings = DEFAULT_INSTRUMENT_SETTINGS,
) {
  switch (code) {
    case "airspeed":
      return {
        speed: speed_from_knots(state.airspeed_knots, settings.speed_unit),
        max: speed_from_knots(settings.speed_max_knots, settings.speed_unit),
        unit: { knots: "KNOTS", kmh: "KM/H", mps: "M/S" }[settings.speed_unit],
        arcs: Object.fromEntries(
          Object.entries({
            white: [33, 85],
            green: [44, 129],
            yellow: [129, 163],
            red: 163,
          }).map(([key, value]) => [
            key,
            Array.isArray(value)
              ? value.map((v) => speed_from_knots(v, settings.speed_unit))
              : speed_from_knots(value, settings.speed_unit),
          ]),
        ),
      };
    case "attitude":
      return {
        pitch: state.pitch_deg,
        roll: state.roll_deg,
        pitchLimit: settings.pitch_limit_deg,
      };
    case "heading":
      return { heading: state.heading_deg };
    case "altitude":
      return {
        altitude: state.altitude_ft,
        pressure:
          settings.pressure_unit === "inHg"
            ? state.pressure_hpa / HPA_PER_INHG
            : state.pressure_hpa,
        pressureUnit: settings.pressure_unit,
      };
    case "vertical_speed":
      return {
        verticalSpeed: state.vertical_speed_fpm,
        max: settings.vertical_speed_max_fpm,
      };
    case "turn":
      return { turnRate: state.turn_rate_deg_s, slip: state.slip };
    default:
      throw new Error(`Unknown flight instrument: ${code}`);
  }
}
