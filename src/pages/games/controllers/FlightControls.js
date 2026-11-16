import { map_flight_controls } from "./FlightControlMapping.js";
import { normalize_flight_control_settings } from "./FlightControlSettings.js";

export function create_flight_controls() {
  let snapshot = map_flight_controls(null);
  const listeners = new Set();
  const update = (input, settings) => {
    const next = map_flight_controls(input, settings);
    if (JSON.stringify(next) === JSON.stringify(snapshot)) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  return {
    get_snapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update,
    reset: () => update(null),
  };
}

// Bind only from an effect/session, never during React render or initialization.
export function bind_flight_controls(
  input,
  controls,
  { read_settings, subscribe_settings },
) {
  let settings = normalize_flight_control_settings(read_settings());
  const refresh = () => controls.update(input.get_snapshot(), settings);
  const unsubscribe_input = input.subscribe(refresh);
  const unsubscribe_settings = subscribe_settings(() => {
    settings = normalize_flight_control_settings(read_settings());
    refresh();
  });
  refresh();
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    unsubscribe_input();
    unsubscribe_settings();
    controls.reset();
  };
}
