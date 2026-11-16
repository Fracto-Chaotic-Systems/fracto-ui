import { useMemo, useSyncExternalStore } from "react";
import AppSettings from "../../../AppSettings.jsx";
import { KEY_GAMES_PLAY_INSTRUMENTS } from "../../../settings/GamesSettings.jsx";
import { normalize_instrument_settings } from "./FlightInstrumentSettings.js";

// AppSettings copies objects on reads. A serialized snapshot keeps React's
// external-store snapshot stable until the persisted settings actually change.
const read = () =>
  JSON.stringify(AppSettings.get(KEY_GAMES_PLAY_INSTRUMENTS) ?? null);
const subscribe = (notify) => {
  const subscription = AppSettings.subscribe(
    KEY_GAMES_PLAY_INSTRUMENTS,
    notify,
  );
  return () => AppSettings.unsubscribe(subscription);
};

export function useInstrumentSettings() {
  const serialized = useSyncExternalStore(subscribe, read, read);
  return useMemo(
    () => normalize_instrument_settings(JSON.parse(serialized)),
    [serialized],
  );
}

export function save_instrument_settings(patch) {
  const current = normalize_instrument_settings(
    AppSettings.get(KEY_GAMES_PLAY_INSTRUMENTS),
  );
  AppSettings.on_settings_changed({
    [KEY_GAMES_PLAY_INSTRUMENTS]: normalize_instrument_settings({
      ...current,
      ...patch,
      placements: { ...current.placements, ...patch.placements },
    }),
  });
}
