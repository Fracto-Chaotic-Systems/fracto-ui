import { useSyncExternalStore } from "react";
import AppSettings from "../../AppSettings.jsx";
import { KEY_GAMES_PLAY_HAZE } from "../../settings/GamesSettings.jsx";
import { normalize_flight_haze } from "./flight/FlightAtmosphere.js";

const read = () => normalize_flight_haze(AppSettings.get(KEY_GAMES_PLAY_HAZE));
const subscribe = (notify) => {
  const subscription = AppSettings.subscribe(KEY_GAMES_PLAY_HAZE, notify);
  return () => AppSettings.unsubscribe(subscription);
};
export function useAtmosphere() {
  return useSyncExternalStore(subscribe, read, read);
}
