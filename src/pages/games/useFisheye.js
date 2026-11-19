import { useSyncExternalStore } from "react";
import AppSettings from "../../AppSettings.jsx";
import {
  KEY_GAMES_PLAY_FISHEYE,
  KEY_GAMES_PLAY_FISHEYE_STRENGTH,
} from "../../settings/GamesSettings.jsx";
import { normalize_fisheye_strength } from "./flight/FlightLens.js";

const read = () =>
  normalize_fisheye_strength(
    AppSettings.get(KEY_GAMES_PLAY_FISHEYE_STRENGTH),
    AppSettings.get(KEY_GAMES_PLAY_FISHEYE),
  );
const subscribe = (notify) => {
  const subscriptions = [
    KEY_GAMES_PLAY_FISHEYE,
    KEY_GAMES_PLAY_FISHEYE_STRENGTH,
  ].map((key) => AppSettings.subscribe(key, notify));
  return () =>
    subscriptions.forEach((subscription) =>
      AppSettings.unsubscribe(subscription),
    );
};
export function useFisheyeStrength() {
  return useSyncExternalStore(subscribe, read, read);
}
