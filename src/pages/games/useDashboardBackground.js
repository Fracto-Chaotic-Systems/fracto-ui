import { useSyncExternalStore } from "react";
import AppSettings from "../../AppSettings.jsx";
import { KEY_GAMES_PLAY_DASHBOARD_BACKGROUND } from "../../settings/GamesSettings.jsx";
import { normalize_dashboard_background } from "./DashboardBackground.js";

const read = () =>
  normalize_dashboard_background(
    AppSettings.get(KEY_GAMES_PLAY_DASHBOARD_BACKGROUND),
  );
const subscribe = (notify) => {
  const subscription = AppSettings.subscribe(
    KEY_GAMES_PLAY_DASHBOARD_BACKGROUND,
    notify,
  );
  return () => AppSettings.unsubscribe(subscription);
};

export function useDashboardBackground() {
  return useSyncExternalStore(subscribe, read, read);
}
