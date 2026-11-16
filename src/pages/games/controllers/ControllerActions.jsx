import { useSyncExternalStore } from "react";
import styled from "styled-components";
import AppSettings from "../../../AppSettings.jsx";
import AppText from "../../../AppText.jsx";
import { KEY_GAMES_PLAY_CONTROLLER_ACTIONS } from "../../../settings/GamesSettings.jsx";
import {
  FLIGHT_CONTROL_ACTION_TEXT,
  KEY_GAMES_PLAY_CONTROLLER_ACTIONS_LABEL,
} from "../../../text/GamesText.jsx";

const ActionBoxes = styled.ul`
  position: absolute;
  left: 50%;
  /* The controller host is already 1rem above the game area's bottom edge. */
  bottom: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-sizing: border-box;
  width: 38%;
  height: auto;
  min-height: 20px;
  margin: 0;
  padding: 0 3px;
  border: 3px solid #292d29;
  border-radius: 3px;
  background:
    repeating-linear-gradient(
      0deg,
      #00ff6810 0px,
      #00000000 1px,
      #00000000 3px
    ),
    linear-gradient(135deg, #101b13, #020603 65%);
  box-shadow:
    inset 2px 2px 5px #000000,
    inset 0 0 8px #22ff4414,
    -1px -1px 0 #b6b4a166,
    3px 4px 4px #160b07c7;
  overflow: hidden;
  list-style: none;
  pointer-events: none;
`;

const ActionBox = styled.li`
  box-sizing: border-box;
  max-width: 100%;
  flex-shrink: 0;
  color: #70ff88;
  text-shadow:
    0 0 3px #29ff62,
    0 0 7px #29ff6273;
  font-family: "Courier New", monospace;
  font-size: clamp(7px, 3.2cqw, 11px);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
`;

const read_enabled = () => !!AppSettings.get(KEY_GAMES_PLAY_CONTROLLER_ACTIONS);
const subscribe_enabled = (notify) => {
  const subscription = AppSettings.subscribe(
    KEY_GAMES_PLAY_CONTROLLER_ACTIONS,
    notify,
  );
  return () => AppSettings.unsubscribe(subscription);
};

function ActiveControllerActions({ controls }) {
  const state = useSyncExternalStore(
    controls.subscribe,
    controls.get_snapshot,
    controls.get_snapshot,
  );
  const actions = state.actions;
  return (
    <>
      {actions.map((code) => (
        <ActionBox key={code}>
          {AppText.get(FLIGHT_CONTROL_ACTION_TEXT[code])}
        </ActionBox>
      ))}
    </>
  );
}

export default function ControllerActions({ controls }) {
  const enabled = useSyncExternalStore(
    subscribe_enabled,
    read_enabled,
    read_enabled,
  );
  return (
    <ActionBoxes
      aria-label={AppText.get(KEY_GAMES_PLAY_CONTROLLER_ACTIONS_LABEL)}
      aria-live="polite"
    >
      {enabled && <ActiveControllerActions controls={controls} />}
    </ActionBoxes>
  );
}
