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
  left: 50%;
  width: ${({ $width }) => $width}px;
  transform: translateX(-50%);
  bottom: 1rem;
  pointer-events: none;
  isolation: isolate;

  &::before {
    content: "";
    position: absolute;
    inset: 0 calc(-12px - 1rem) -1rem;
    z-index: -1;
    border: 4px solid transparent;
    border-bottom: 0;
    border-radius: ${({ $shoulder_radius }) =>
      `${$shoulder_radius}px ${$shoulder_radius}px 0 0`};
    background:
      linear-gradient(110deg, #ffffff14, #00000033) padding-box,
      repeating-linear-gradient(
          2deg,
          #24100700 0px,
          #24100700 3px,
          #24100738 4px,
          #d5964b26 5px,
          #24100700 8px
        )
        padding-box,
      repeating-linear-gradient(
          177deg,
          #713c20 0px,
          #92542d 18px,
          #5b2f19 36px,
          #804623 55px
        )
        padding-box,
      linear-gradient(
          135deg,
          #faf5de 0%,
          #a7997a 12%,
          #fffdf2 25%,
          #706957 43%,
          #ded8bd 58%,
          #fffdf2 72%,
          #6b6251 88%,
          #d9ceb1 100%
        )
        border-box;
    box-shadow:
      inset 0 1px 2px #fff6d580,
      inset 0 -3px 8px #1c0d09a6,
      2px 3px 3px #00000099,
      6px 10px 20px #00000066;
  }
`;

const InstrumentCaption = styled.div`
  position: absolute;
  bottom: 100%;
  width: 100%;
  height: 24px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: #f4e1bd;
  font-size: 0.75rem;
  line-height: 24px;
  text-align: center;
`;

const ControlsLayout = styled.div`
  display: grid;
  grid-template-columns: ${({ $compact, $controller_width, $group_widths }) =>
    $compact
      ? "1fr"
      : `${$group_widths[0]}px ${$controller_width}px ${$group_widths[1]}px`};
  grid-template-areas: ${({ $compact, $groups }) =>
    $compact
      ? [...$groups.map((group) => `"${group.side}"`), '"controller"'].join(" ")
      : '"left controller right"'};
  align-items: end;
  gap: ${({ $compact }) => ($compact ? "8px" : "0")};
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
    <ControlsDock
      $width={layout.dock_width}
      $shoulder_radius={layout.instrument_size / 2 + 28}
    >
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
        $group_widths={layout.group_widths}
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
