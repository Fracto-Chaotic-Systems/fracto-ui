import { useSyncExternalStore } from "react";
import styled from "styled-components";
import {
  Airspeed,
  Altimeter,
  AttitudeIndicator,
  HeadingIndicator,
  TurnCoordinator,
  VerticalSpeed,
} from "flight-indicators";
import AppText from "../../../AppText.jsx";
import NightFlightSwitch from "../NightFlightSwitch.jsx";
import { dashboard_nameplate } from "../DashboardNameplate.js";
import {
  FLIGHT_INSTRUMENT_TEXT,
  FLIGHT_SETTINGS_TEXT,
} from "../../../text/GamesText.jsx";
import {
  flight_instrument_props,
  HPA_PER_INHG,
} from "./FlightInstrumentModel.js";
import {
  DEFAULT_INSTRUMENT_SETTINGS,
  instrument_codes,
  speed_from_knots,
} from "./FlightInstrumentSettings.js";

const InstrumentGroup = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: repeat(
    ${({ $columns }) => $columns},
    ${({ $size }) => $size}px
  );
  gap: 8px;
  justify-items: center;

  > figure:last-child {
    grid-column: ${({ $center_last }) => ($center_last ? "1 / -1" : "auto")};
  }
`;

const Instrument = styled.figure`
  position: relative;
  width: ${({ $size }) => $size}px;
  transform: translateX(${({ $offset = 0 }) => $offset}px);
  margin: 0;
  color: #f4e1bd;
  text-shadow: 0 1px 2px #241007;
  text-align: center;

  > :first-child {
    filter: drop-shadow(4px 5px 5px #160b07c7);
  }

  /* A concealed lamp catches the inner rim, then fades down into the dial.
     Keep it separate from the SVG so needles and telemetry remain untouched. */
  &::after {
    content: ${({ $night }) => ($night ? '""' : "none")};
    position: absolute;
    z-index: 1;
    pointer-events: none;
    left: ${({ $size }) => $size * 0.045}px;
    top: ${({ $size }) => $size * 0.045}px;
    width: ${({ $size }) => $size * 0.91}px;
    height: ${({ $size }) => $size * 0.91}px;
    border-radius: 50%;
    transform: rotate(-30deg);
    background: radial-gradient(
      ellipse 65% 35% at 50% 0%,
      #ffb54d45,
      #ffb54d00
    );
    box-shadow:
      inset 0 ${({ $size }) => $size * 0.05}px ${({ $size }) => $size * 0.05}px
        ${({ $size }) => -$size * 0.025}px #ffd28be6,
      inset 0 ${({ $size }) => $size * 0.11}px ${({ $size }) => $size * 0.13}px
        ${({ $size }) => -$size * 0.06}px #ff9b3599;
    mask-image: linear-gradient(to bottom, #000 0%, #000 15%, #0000 55%);
  }

  ${({ $night }) =>
    $night &&
    `
    > svg text {
      fill: #ffd094;
      filter: drop-shadow(0 0 3px #ffad5890);
    }
    > svg [fill="#fff"], > svg [fill="#eee"], > svg [fill="#ddd"],
    > svg [fill="#ffffff"] {
      fill: #ffd094;
      filter: drop-shadow(0 0 3px #ffad5890);
    }
    > svg [stroke="#fff"], > svg [stroke="#eee"], > svg [stroke="#ddd"],
    > svg [stroke="#ffffff"] {
      stroke: #ffd094;
      filter: drop-shadow(0 0 3px #ffad5890);
    }
    > svg rect { filter: brightness(0.55); }
    && > figcaption {
      background: linear-gradient(175deg, #554b38, #26251e);
      color: #ffd094;
      text-shadow: 0 0 4px #ffad5860;
      border-color: #514b3c;
    }
  `}

  > figcaption {
    ${dashboard_nameplate}
    font-size: ${({ $size }) => Math.min(10, $size * 0.085)}px;
    visibility: ${({ $size }) => ($size < 64 ? "hidden" : "visible")};
  }
`;

const INSTRUMENTS = {
  airspeed: Airspeed,
  attitude: AttitudeIndicator,
  heading: HeadingIndicator,
  altitude: Altimeter,
  vertical_speed: VerticalSpeed,
  turn: TurnCoordinator,
};

function instrument_title(code, state, settings) {
  let reading = AppText.get(FLIGHT_INSTRUMENT_TEXT[`${code}_reading`]);
  const values = {
    ...state,
    airspeed_value: speed_from_knots(state.airspeed_knots, settings.speed_unit),
    pressure_value:
      settings.pressure_unit === "inHg"
        ? state.pressure_hpa / HPA_PER_INHG
        : state.pressure_hpa,
    speed_unit: AppText.get(FLIGHT_SETTINGS_TEXT[settings.speed_unit]),
    pressure_unit: settings.pressure_unit,
  };
  for (const [key, value] of Object.entries(values)) {
    reading = reading.replaceAll(
      `{${key}}`,
      typeof value === "number" ? String(Number(value.toFixed(2))) : value,
    );
  }
  return `${AppText.get(FLIGHT_INSTRUMENT_TEXT[code])}: ${reading} — ${AppText.get(FLIGHT_INSTRUMENT_TEXT[state.source])}`;
}

export default function FlightInstrumentGroup({
  side,
  size_px,
  compact,
  flight_state,
  night = false,
  show_night_switch = false,
  settings = DEFAULT_INSTRUMENT_SETTINGS,
}) {
  const state = useSyncExternalStore(
    flight_state.subscribe,
    flight_state.get_snapshot,
    flight_state.get_snapshot,
  );
  const codes = instrument_codes(settings, side);
  const columns = Math.min(compact ? 3 : 2, codes.length);
  const heading_index = codes.indexOf("heading");
  if (!codes.length) return null;
  return (
    <InstrumentGroup
      $columns={columns}
      $center_last={!compact && columns === 2 && codes.length % 2 === 1}
      $size={size_px}
    >
      {show_night_switch && heading_index >= 0 && (
        <NightFlightSwitch
          enabled={night}
          width_px={Math.min(54, (size_px + 8) / 2 - 6)}
          top_px={
            Math.floor(heading_index / columns) * (size_px + 24) +
            size_px / 2 -
            (Math.min(54, (size_px + 8) / 2 - 6) * 2) / 3
          }
        />
      )}
      {codes.map((code) => {
        const Component = INSTRUMENTS[code];
        return (
          <Instrument
            key={code}
            $size={size_px}
            $night={night}
            $offset={
              code === "heading" && show_night_switch
                ? (Math.min(54, (size_px + 8) / 2 - 6) + 2) / 2
                : 0
            }
          >
            <Component
              {...flight_instrument_props(code, state, settings)}
              size={size_px}
              style={{ display: "block" }}
              showBox={false}
              animationDuration={settings.animation_ms}
              title={instrument_title(code, state, settings)}
            />
            <figcaption>{AppText.get(FLIGHT_INSTRUMENT_TEXT[code])}</figcaption>
          </Instrument>
        );
      })}
    </InstrumentGroup>
  );
}
