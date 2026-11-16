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
  width: ${({ $size }) => $size}px;
  margin: 0;
  color: #f4e1bd;
  text-shadow: 0 1px 2px #241007;
  text-align: center;

  > :first-child {
    filter: drop-shadow(4px 5px 5px #160b07c7);
  }

  > figcaption {
    position: relative;
    box-sizing: border-box;
    height: 16px;
    padding: 0 10px;
    border: 1px solid #514d43;
    border-radius: 3px;
    background:
      repeating-linear-gradient(
        0deg,
        #ffffff00 0px,
        #ffffff00 1px,
        #ffffff24 2px,
        #0000000d 3px
      ),
      linear-gradient(175deg, #f5f1e4, #b6b1a2 48%, #dfdacc 52%, #9b9587);
    box-shadow:
      inset 0 1px 0 #ffffffbf,
      inset 0 -1px 0 #59534580,
      2px 2px 2px #180d09d9;
    color: #292823;
    text-shadow: 0 1px 0 #ffffff99;
    font-size: ${({ $size }) => Math.min(10, $size * 0.085)}px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    line-height: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    visibility: ${({ $size }) => ($size < 64 ? "hidden" : "visible")};

    &::before,
    &::after {
      content: "";
      position: absolute;
      top: 5px;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: radial-gradient(
        circle at 30% 25%,
        #fffdf3,
        #aaa494 45%,
        #49463d
      );
      box-shadow:
        0 0 0 1px #655f50,
        0 1px 1px #ffffff80;
    }

    &::before {
      left: 3px;
    }

    &::after {
      right: 3px;
    }
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
  settings = DEFAULT_INSTRUMENT_SETTINGS,
}) {
  const state = useSyncExternalStore(
    flight_state.subscribe,
    flight_state.get_snapshot,
    flight_state.get_snapshot,
  );
  const codes = instrument_codes(settings, side);
  const columns = Math.min(compact ? 3 : 2, codes.length);
  if (!codes.length) return null;
  return (
    <InstrumentGroup
      $columns={columns}
      $center_last={!compact && columns === 2 && codes.length % 2 === 1}
      $size={size_px}
    >
      {codes.map((code) => {
        const Component = INSTRUMENTS[code];
        return (
          <Instrument key={code} $size={size_px}>
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
