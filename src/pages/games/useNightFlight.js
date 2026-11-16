import { useSyncExternalStore } from "react";
import AppSettings from "../../AppSettings.jsx";
import { KEY_GAMES_PLAY_NIGHT_FLIGHT } from "../../settings/GamesSettings.jsx";

const read = () => AppSettings.get(KEY_GAMES_PLAY_NIGHT_FLIGHT) === true;
const subscribe = (notify) => {
  const subscription = AppSettings.subscribe(
    KEY_GAMES_PLAY_NIGHT_FLIGHT,
    notify,
  );
  return () => AppSettings.unsubscribe(subscription);
};

export function useNightFlight() {
  return useSyncExternalStore(subscribe, read, read);
}

export function set_night_flight(enabled) {
  AppSettings.on_settings_changed({ [KEY_GAMES_PLAY_NIGHT_FLIGHT]: !!enabled });
}
