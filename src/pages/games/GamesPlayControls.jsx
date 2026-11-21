import styled, { css, keyframes } from "styled-components";
import AppText from "../../AppText.jsx";
import { FLIGHT_SETTINGS_TEXT } from "../../text/GamesText.jsx";
import GameController from "./controllers/GameController.jsx";
import FlightInstrumentGroup from "./flight/FlightInstrumentGroup.jsx";
import FlightInstrumentStatus from "./flight/FlightInstrumentStatus.jsx";
import { game_controls_layout } from "./GamesPlayControlsLayout.js";
import { useInstrumentSettings } from "./flight/useInstrumentSettings.js";
import { useDashboardBackground } from "./useDashboardBackground.js";
import { dashboard_background } from "./DashboardBackground.js";
import { useNightFlight } from "./useNightFlight.js";
import NightFlightSwitch from "./NightFlightSwitch.jsx";
import GamesPlayMap from "./GamesPlayMap.jsx";

const pearl_drift = keyframes`
  from { background-position: 0 0, 0% 0%, 0 0; }
  to { background-position: 0 0, 100% 100%, 0 0; }
`;

const metal_shine = keyframes`
  from { background-position: 0% 0, 0 0, 0 0, 0 0; }
  to { background-position: 100% 0, 0 0, 0 0, 0 0; }
`;

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
    background: ${({ $background, $night }) => dashboard_background($background, $night)};
    filter: ${({ $night }) => ($night ? "brightness(0.42) saturate(0.65)" : "none")};
    ${({ $background }) =>
      $background === "pearl" &&
      css`
        animation: ${pearl_drift} 45s ease-in-out infinite alternate;
        @media (prefers-reduced-motion: reduce) {
          animation: none;
        }
      `}
    ${({ $background }) =>
      $background === "metal" &&
      css`
        animation: ${metal_shine} 32s ease-in-out infinite alternate;
        @media (prefers-reduced-motion: reduce) {
          animation: none;
        }
      `}
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
  position: relative;
  grid-area: controller;
  justify-self: center;
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
  pointer-events: auto;
  ${({ $night }) =>
    $night &&
    `
    > div > div > svg {
      filter: brightness(0.65) drop-shadow(10px 12px 14px #160b07cc);
    }
    ul { filter: brightness(0.7); }
  `}
`;

export default function GamesPlayControls({
  input,
  flight_controls,
  flight_state,
  width_px,
  height_px,
}) {
  const settings = useInstrumentSettings();
  const background = useDashboardBackground();
  const night = useNightFlight();
  const layout = game_controls_layout(width_px, height_px, settings);
  const groups = layout.groups.filter((group) => group.count);
  const group_height = (group) =>
    group.rows * (layout.instrument_size + 16) + Math.max(0, group.rows - 1) * 8;
  const dock_height = layout.compact
    ? layout.controller_height +
      groups.reduce((sum, group) => sum + group_height(group) + 8, 0)
    : Math.max(layout.controller_height, ...groups.map(group_height));
  if (!width_px || !height_px) return null;
  return (
    <ControlsDock
      $night={night}
      $background={background}
      $width={layout.dock_width}
      $shoulder_radius={layout.instrument_size / 2 + 28}
    >
      <GamesPlayMap
        flight_state={flight_state}
        width_px={width_px}
        height_px={height_px}
        dock_width={layout.dock_width}
        dock_height={dock_height}
      />
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
              night={night}
              show_night_switch={layout.heading_switch_side === side}
            />
          </InstrumentSlot>
        ))}
        <ControllerSlot
          $night={night}
          $width={layout.controller_width}
          $height={layout.controller_height}
        >
          <GameController input={input} flight_controls={flight_controls} />
          {!layout.heading_switch_side && (
            <NightFlightSwitch
              enabled={night}
              width_px={Math.min(54, layout.controller_width * 0.17)}
            />
          )}
        </ControllerSlot>
      </ControlsLayout>
    </ControlsDock>
  );
}
