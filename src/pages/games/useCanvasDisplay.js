import { useSyncExternalStore } from "react";
import AppSettings from "../../AppSettings.jsx";
import { KEY_GAMES_PLAY_CANVAS_SHAPE } from "../../settings/GamesSettings.jsx";

const read_shape = () =>
  AppSettings.get(KEY_GAMES_PLAY_CANVAS_SHAPE) === "porthole"
    ? "porthole"
    : "cinema";
const subscribe_shape = (notify) => {
  const subscription = AppSettings.subscribe(
    KEY_GAMES_PLAY_CANVAS_SHAPE,
    notify,
  );
  return () => AppSettings.unsubscribe(subscription);
};
export function useCanvasShape() {
  return useSyncExternalStore(subscribe_shape, read_shape, read_shape);
}
