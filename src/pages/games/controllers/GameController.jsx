import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import AppSettings from "../../../AppSettings.jsx";
import AppText from "../../../AppText.jsx";
import { KEY_GAMES_PLAY_CONTROLLER } from "../../../settings/GamesSettings.jsx";
import {
  KEY_GAMES_PLAY_CONTROLLER_ERROR,
  KEY_GAMES_PLAY_CONTROLLER_ON_SCREEN_TITLE,
} from "../../../text/GamesText.jsx";
import { CONTROLLER_PROVIDERS } from "./ControllerProviders.js";
import { start_controller_session } from "./ControllerSession.js";
import ControllerActions from "./ControllerActions.jsx";

const ControllerHost = styled.div`
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  width: min(22rem, calc(100% - 2rem));
  aspect-ratio: 276 / 232;
  max-height: 45%;
  touch-action: none;
  user-select: none;

  > div {
    width: 100%;
    height: 100%;
  }

  > div > svg {
    display: block;
    width: 100%;
    height: 100%;
  }
`;

const read_device = () => {
  const saved = AppSettings.get(KEY_GAMES_PLAY_CONTROLLER);
  return ["on_screen", "keyboard", "hand_held"].includes(saved)
    ? saved
    : "on_screen";
};

export default function GameController({ input }) {
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
      aria-label={AppText.get(KEY_GAMES_PLAY_CONTROLLER_ON_SCREEN_TITLE)}
    >
      <div ref={host_ref} />
      <ControllerActions input={input} />
      {error === device && (
        <p role="status">{AppText.get(KEY_GAMES_PLAY_CONTROLLER_ERROR)}</p>
      )}
    </ControllerHost>
  );
}
