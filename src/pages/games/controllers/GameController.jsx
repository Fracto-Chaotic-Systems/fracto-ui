import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styled from "styled-components";
import AppSettings from "../../../AppSettings.jsx";
import AppText from "../../../AppText.jsx";
import {
  KEY_GAMES_PLAY_CONTROLLER,
  KEY_GAMES_PLAY_CONTROLLER_COLOR,
} from "../../../settings/GamesSettings.jsx";
import {
  KEY_GAMES_PLAY_CONTROLLER_ERROR,
  KEY_GAMES_PLAY_CONTROLLER_ON_SCREEN_TITLE,
} from "../../../text/GamesText.jsx";
import { CONTROLLER_PROVIDERS } from "./ControllerProviders.js";
import { start_controller_session } from "./ControllerSession.js";
import ControllerActions from "./ControllerActions.jsx";
import {
  controller_color_style,
  normalize_controller_color,
} from "./ControllerColors.js";

const read_color = () =>
  normalize_controller_color(AppSettings.get(KEY_GAMES_PLAY_CONTROLLER_COLOR));
const subscribe_color = (notify) => {
  const subscription = AppSettings.subscribe(
    KEY_GAMES_PLAY_CONTROLLER_COLOR,
    notify,
  );
  return () => AppSettings.unsubscribe(subscription);
};

const ControllerHost = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  touch-action: none;
  user-select: none;
  container-type: inline-size;

  > div {
    width: 100%;
    height: 100%;
  }

  > div > svg {
    display: block;
    width: 100%;
    height: 100%;
    filter: drop-shadow(10px 12px 14px #160b07cc);
  }
`;

const read_device = () => {
  const saved = AppSettings.get(KEY_GAMES_PLAY_CONTROLLER);
  return ["on_screen", "keyboard", "hand_held"].includes(saved)
    ? saved
    : "on_screen";
};

export default function GameController({ input, flight_controls }) {
  const color = useSyncExternalStore(subscribe_color, read_color, read_color);
  const host_ref = useRef(null);
  const [device, set_device] = useState(read_device);
  const [error, set_error] = useState(null);

  useEffect(() => {
    const subscription = AppSettings.subscribe(KEY_GAMES_PLAY_CONTROLLER, () =>
      set_device(read_device()),
    );
    return () => AppSettings.unsubscribe(subscription);
  }, []);

  useEffect(() => {
    const load = CONTROLLER_PROVIDERS[device];
    input.reset();
    if (!load) return;
    const session = start_controller_session(load, host_ref.current, {
      on_input: input.update,
      on_stick_reset: input.request_stick_reset,
      on_ready: () => set_error(null),
      on_error: () => set_error(device),
    });
    return () => {
      session.destroy();
      input.reset();
    };
  }, [device, input]);

  if (!CONTROLLER_PROVIDERS[device]) return null;
  return (
    <ControllerHost
      style={controller_color_style(color)}
      aria-label={AppText.get(KEY_GAMES_PLAY_CONTROLLER_ON_SCREEN_TITLE)}
    >
      <div ref={host_ref} />
      <ControllerActions controls={flight_controls} />
      {error === device && (
        <p role="status">{AppText.get(KEY_GAMES_PLAY_CONTROLLER_ERROR)}</p>
      )}
    </ControllerHost>
  );
}
