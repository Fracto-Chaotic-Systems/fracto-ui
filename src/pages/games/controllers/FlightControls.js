import { map_flight_controls } from "./FlightControlMapping.js";
import { normalize_flight_control_settings } from "./FlightControlSettings.js";

export function create_flight_controls() {
  let snapshot = map_flight_controls(null);
  const listeners = new Set();
  const neutralizers = new Set();
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
    neutralize(channels) {
      neutralizers.forEach((listener) => listener(channels));
    },
    subscribe_neutralize(listener) {
      neutralizers.add(listener);
      return () => neutralizers.delete(listener);
    },
    update,
    reset: () => update(null),
  };
}

// Bind only from an effect/session, never during React render or initialization.
export function bind_flight_controls(
  input,
  controls,
  { read_settings, subscribe_settings, auto_pilot = null },
) {
  let settings = normalize_flight_control_settings(read_settings());
  const refresh = () => {
    const state = input.get_snapshot();
    if (!auto_pilot?.get_snapshot()) {
      controls.update(state, settings);
      return;
    }
    // Only the physical look stick survives; button remaps and the movement stick
    // cannot inject camera or aircraft commands while the pilot owns the craft.
    controls.update(
      { ...state, axes: [0, 0, state.axes[2], state.axes[3]], buttons: [] },
      {
        ...settings,
        axes: {
          left_x: "none",
          left_y: "none",
          right_x: "look_x",
          right_y: "look_y",
        },
      },
    );
  };
  const unsubscribe_pilot = auto_pilot?.subscribe(refresh);
  const unsubscribe_input = input.subscribe(refresh);
  const unsubscribe_stick_reset = input.subscribe_stick_reset?.((stick) => {
    if (auto_pilot?.get_snapshot()) {
      if (stick === 1) controls.neutralize(["look_x", "look_y"]);
      return;
    }
    const axes = stick === 0 ? ["left_x", "left_y"] : ["right_x", "right_y"];
    controls.neutralize([
      ...new Set(
        axes
          .map((axis) => settings.axes[axis])
          .filter((channel) => channel !== "none"),
      ),
    ]);
  });
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
    unsubscribe_pilot?.();
    unsubscribe_stick_reset?.();
    unsubscribe_settings();
    controls.reset();
  };
}
