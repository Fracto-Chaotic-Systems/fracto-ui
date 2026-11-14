import { useSyncExternalStore } from "react";
import styled from "styled-components";
import AppSettings from "../../../AppSettings.jsx";
import AppText from "../../../AppText.jsx";
import { KEY_GAMES_PLAY_CONTROLLER_ACTIONS } from "../../../settings/GamesSettings.jsx";
import {
  CONTROLLER_ACTION_TEXT,
  KEY_GAMES_PLAY_CONTROLLER_ACTIONS_LABEL,
} from "../../../text/GamesText.jsx";
import { controller_action_codes } from "./ControllerActions.js";

const ActionBoxes = styled.ul`
  position: absolute;
  left: 50%;
  /* The controller host is already 1rem above the game area's bottom edge. */
  bottom: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  width: max-content;
  max-width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
  pointer-events: none;
`;

const ActionBox = styled.li`
  box-sizing: border-box;
  max-width: 100%;
  padding: 0.375rem 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid #cccccc;
  background: #fafafa;
  color: #333333;
  box-shadow: 0 2px 5px #00000033;
  font-size: 1rem;
  line-height: 1.25;
  text-align: center;
  overflow-wrap: anywhere;
`;

const read_enabled = () => !!AppSettings.get(KEY_GAMES_PLAY_CONTROLLER_ACTIONS);
const subscribe_enabled = (notify) => {
  const subscription = AppSettings.subscribe(
    KEY_GAMES_PLAY_CONTROLLER_ACTIONS,
    notify,
  );
  return () => AppSettings.unsubscribe(subscription);
};

function ActiveControllerActions({ input }) {
  const state = useSyncExternalStore(
    input.subscribe,
    input.get_snapshot,
    input.get_snapshot,
  );
  const actions = controller_action_codes(state);
  if (!actions.length) return null;
  return (
    <ActionBoxes
      aria-label={AppText.get(KEY_GAMES_PLAY_CONTROLLER_ACTIONS_LABEL)}
    >
      {actions.map((code) => (
        <ActionBox key={code}>
          {AppText.get(CONTROLLER_ACTION_TEXT[code])}
        </ActionBox>
      ))}
    </ActionBoxes>
  );
}

export default function ControllerActions({ input }) {
  const enabled = useSyncExternalStore(
    subscribe_enabled,
    read_enabled,
    read_enabled,
  );
  return enabled ? <ActiveControllerActions input={input} /> : null;
}
