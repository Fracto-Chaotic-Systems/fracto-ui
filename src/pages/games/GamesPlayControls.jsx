import styled from "styled-components";
import AppText from "../../AppText.jsx";
import { FLIGHT_SETTINGS_TEXT } from "../../text/GamesText.jsx";
import GameController from "./controllers/GameController.jsx";
import FlightInstrumentGroup from "./flight/FlightInstrumentGroup.jsx";
import FlightInstrumentStatus from "./flight/FlightInstrumentStatus.jsx";
import { game_controls_layout } from "./GamesPlayControlsLayout.js";
import { useInstrumentSettings } from "./flight/useInstrumentSettings.js";

const ControlsDock = styled.div`
  position: absolute;
  left: 1rem;
  right: 1rem;
  bottom: 1rem;
  pointer-events: none;
`;

const InstrumentCaption = styled.div`
  height: 24px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: #666666;
  font-size: 0.75rem;
  line-height: 24px;
  text-align: center;
`;

const ControlsLayout = styled.div`
  display: grid;
  grid-template-columns: ${({ $compact, $controller_width }) =>
    $compact ? "1fr" : `minmax(0, 1fr) ${$controller_width}px minmax(0, 1fr)`};
  grid-template-areas: ${({ $compact, $groups }) =>
    $compact
      ? [...$groups.map((group) => `"${group.side}"`), '"controller"'].join(" ")
      : '"left controller right"'};
  align-items: end;
  gap: ${({ $compact }) => ($compact ? "8px" : "24px")};
`;

const InstrumentSlot = styled.div`
  grid-area: ${({ $side }) => $side};
  justify-self: ${({ $side, $compact }) =>
    $compact ? "center" : $side === "left" ? "end" : "start"};
`;

const ControllerSlot = styled.div`
  grid-area: controller;
  justify-self: center;
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
  pointer-events: auto;
`;

export default function GamesPlayControls({
  input,
  flight_controls,
  flight_state,
  width_px,
  height_px,
}) {
  const settings = useInstrumentSettings();
  const layout = game_controls_layout(width_px, height_px, settings);
  const groups = layout.groups.filter((group) => group.count);
  if (!width_px || !height_px) return null;
  return (
    <ControlsDock>
      {(layout.visible || layout.limited) && (
        <InstrumentCaption
          title={
            layout.limited
              ? AppText.get(FLIGHT_SETTINGS_TEXT.needs_space)
              : undefined
          }
        >
          {layout.limited ? (
            AppText.get(FLIGHT_SETTINGS_TEXT.needs_space)
          ) : (
            <FlightInstrumentStatus flight_state={flight_state} />
          )}
        </InstrumentCaption>
      )}
      <ControlsLayout
        $compact={layout.compact}
        $groups={groups}
        $controller_width={layout.controller_width}
      >
        {groups.map(({ side }) => (
          <InstrumentSlot key={side} $side={side} $compact={layout.compact}>
            <FlightInstrumentGroup
              settings={settings}
              flight_state={flight_state}
              side={side}
              size_px={layout.instrument_size}
              compact={layout.compact}
            />
          </InstrumentSlot>
        ))}
        <ControllerSlot
          $width={layout.controller_width}
          $height={layout.controller_height}
        >
          <GameController input={input} flight_controls={flight_controls} />
        </ControllerSlot>
      </ControlsLayout>
    </ControlsDock>
  );
}
