import { useSyncExternalStore } from "react";
import AppSettings from "../../AppSettings.jsx";
import { KEY_GAMES_PLAY_CANVAS_DISPLAY } from "../../settings/GamesSettings.jsx";

const read = () =>
  AppSettings.get(KEY_GAMES_PLAY_CANVAS_DISPLAY) === "640x480"
    ? "640x480"
    : "fill";
const subscribe = (notify) => {
  const subscription = AppSettings.subscribe(
    KEY_GAMES_PLAY_CANVAS_DISPLAY,
    notify,
  );
  return () => AppSettings.unsubscribe(subscription);
};

export function useCanvasDisplay() {
  return useSyncExternalStore(subscribe, read, read);
}
