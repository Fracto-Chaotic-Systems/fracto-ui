import { map_flight_controls } from "./FlightControlMapping.js";
import { normalize_flight_control_settings } from "./FlightControlSettings.js";

export function controller_action_codes(state, settings) {
  return map_flight_controls(state, normalize_flight_control_settings(settings))
    .actions;
}
