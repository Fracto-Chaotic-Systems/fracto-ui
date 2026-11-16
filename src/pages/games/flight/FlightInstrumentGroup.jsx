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
  color: #555555;
  text-align: center;

  > figcaption {
    height: 16px;
    font-size: 0.6875rem;
    line-height: 16px;
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
