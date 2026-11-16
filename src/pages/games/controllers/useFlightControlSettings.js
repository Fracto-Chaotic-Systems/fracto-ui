import { useMemo, useSyncExternalStore } from "react";
import AppSettings from "../../../AppSettings.jsx";
import { KEY_GAMES_PLAY_FLIGHT_CONTROLS } from "../../../settings/GamesSettings.jsx";
import { normalize_flight_control_settings } from "./FlightControlSettings.js";

export const read_flight_control_settings = () =>
  AppSettings.get(KEY_GAMES_PLAY_FLIGHT_CONTROLS);
export const subscribe_flight_control_settings = (notify) => {
  const subscription = AppSettings.subscribe(
    KEY_GAMES_PLAY_FLIGHT_CONTROLS,
    notify,
  );
  return () => AppSettings.unsubscribe(subscription);
};
const read = () => JSON.stringify(read_flight_control_settings() ?? null);
export function useFlightControlSettings() {
  const serialized = useSyncExternalStore(
    subscribe_flight_control_settings,
    read,
    read,
  );
  return useMemo(
    () => normalize_flight_control_settings(JSON.parse(serialized)),
    [serialized],
  );
}
export function save_flight_control_settings(patch) {
  const current = normalize_flight_control_settings(
    read_flight_control_settings(),
  );
  AppSettings.on_settings_changed({
    [KEY_GAMES_PLAY_FLIGHT_CONTROLS]: normalize_flight_control_settings({
      ...current,
      ...patch,
      axes: { ...current.axes, ...patch.axes },
      axis_inverted: { ...current.axis_inverted, ...patch.axis_inverted },
      buttons: { ...current.buttons, ...patch.buttons },
    }),
  });
}
