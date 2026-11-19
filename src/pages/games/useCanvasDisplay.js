import { useSyncExternalStore } from "react";
import AppSettings from "../../AppSettings.jsx";
import {
  KEY_GAMES_PLAY_CANVAS_DISPLAY,
  KEY_GAMES_PLAY_CANVAS_SHAPE,
} from "../../settings/GamesSettings.jsx";

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
