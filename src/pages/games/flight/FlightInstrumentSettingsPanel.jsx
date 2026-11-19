import styled from "styled-components";
import Switch from "@mui/material/Switch";
import AppText from "../../../AppText.jsx";
import {
  FLIGHT_INSTRUMENT_TEXT,
  FLIGHT_SETTINGS_TEXT,
} from "../../../text/GamesText.jsx";
import {
  DEFAULT_INSTRUMENT_SETTINGS,
  FLIGHT_INSTRUMENT_CODES,
  speed_from_knots,
  speed_to_knots,
} from "./FlightInstrumentSettings.js";
import {
  save_instrument_settings,
  useInstrumentSettings,
} from "./useInstrumentSettings.js";
import { MAX_FLIGHT_AIRSPEED_KNOTS } from "./FlightUnits.js";

const Row = styled.label`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.375rem 0 0.375rem var(--section-label-indent, 1.25rem);
  > select,
  > input {
    box-sizing: border-box;
    min-width: 0;
    max-width: 100%;
    padding: 0.375rem 0.5rem;
  }
  > input {
    width: 7rem;
  }
`;

const Fields = styled.fieldset`
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
`;

const Note = styled.p`
  padding-left: var(--section-label-indent, 1.25rem);
  font-size: 0.75rem;
  line-height: 1.4;
  color: #666666;
`;

const ResetButton = styled.button`
  margin: 0.5rem 0 0.75rem var(--section-label-indent, 1.25rem);
  padding: 0.375rem 0.5rem;
  max-width: calc(100% - 1.25rem);
`;

const text = (code) => AppText.get(FLIGHT_SETTINGS_TEXT[code]);

function NumberSetting({ label, value, min, max, onCommit }) {
  const display_value = Number(value.toFixed(2));
  return (
    <Row>
      <span>{label}</span>
      <input
        key={value}
        type="number"
        defaultValue={display_value}
        min={min}
        max={max}
        step="any"
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        onBlur={(event) => {
          // Merely focusing a rounded converted value must not alter its
          // canonical value (for example when switching airspeed units).
          if (
            event.currentTarget.value !== "" &&
            Number(event.currentTarget.value) === display_value
          )
            return;
          const parsed =
            event.currentTarget.value === ""
              ? value
              : Number(event.currentTarget.value);
          const next = Number.isFinite(parsed)
            ? Math.max(min, Math.min(max, parsed))
            : value;
          event.currentTarget.value = String(Number(next.toFixed(2)));
          onCommit(next);
        }}
      />
    </Row>
  );
}

function ChoiceSetting({ code, value, options, onChange }) {
  return (
    <Row>
      <span>{text(code)}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {text(option)}
          </option>
        ))}
      </select>
    </Row>
  );
}

export default function FlightInstrumentSettingsPanel() {
  const settings = useInstrumentSettings();
  return (
    <>
      <Row>
        {text("show")}
        <Switch
          checked={settings.visible}
          onChange={(_, visible) => save_instrument_settings({ visible })}
        />
      </Row>
      <Fields disabled={!settings.visible}>
        <ChoiceSetting
          code="size"
          value={settings.size}
          options={["small", "medium", "large"]}
          onChange={(size) => save_instrument_settings({ size })}
        />
        <ChoiceSetting
          code="speed_units"
          value={settings.speed_unit}
          options={["knots", "kmh", "mps"]}
          onChange={(speed_unit) => save_instrument_settings({ speed_unit })}
        />
        <ChoiceSetting
          code="pressure_units"
          value={settings.pressure_unit}
          options={["hPa", "inHg"]}
          onChange={(pressure_unit) =>
            save_instrument_settings({ pressure_unit })
          }
        />
        <NumberSetting
          label={text("speed_range").replace(
            "{unit}",
            text(settings.speed_unit),
          )}
          value={speed_from_knots(
            settings.speed_max_knots,
            settings.speed_unit,
          )}
          min={speed_from_knots(MAX_FLIGHT_AIRSPEED_KNOTS, settings.speed_unit)}
          max={speed_from_knots(1000, settings.speed_unit)}
          onCommit={(value) =>
            save_instrument_settings({
              speed_max_knots: speed_to_knots(value, settings.speed_unit),
            })
          }
        />
        <NumberSetting
          label={text("pitch_limit")}
          value={settings.pitch_limit_deg}
          min={10}
          max={90}
          onCommit={(pitch_limit_deg) =>
            save_instrument_settings({ pitch_limit_deg })
          }
        />
        <NumberSetting
          label={text("vertical_range")}
          value={settings.vertical_speed_max_fpm}
          min={500}
          max={10000}
          onCommit={(vertical_speed_max_fpm) =>
            save_instrument_settings({ vertical_speed_max_fpm })
          }
        />
        <NumberSetting
          label={text("animation")}
          value={settings.animation_ms}
          min={0}
          max={1000}
          onCommit={(animation_ms) =>
            save_instrument_settings({ animation_ms })
          }
        />
        {FLIGHT_INSTRUMENT_CODES.map((code) => (
          <Row key={code}>
            <span>{AppText.get(FLIGHT_INSTRUMENT_TEXT[code])}</span>
            <select
              aria-label={text("placement").replace(
                "{instrument}",
                AppText.get(FLIGHT_INSTRUMENT_TEXT[code]),
              )}
              value={settings.placements[code]}
              onChange={(event) =>
                save_instrument_settings({
                  placements: { [code]: event.target.value },
                })
              }
            >
              {["left", "right", "hidden"].map((side) => (
                <option key={side} value={side}>
                  {text(side)}
                </option>
              ))}
            </select>
          </Row>
        ))}
      </Fields>
      <Note>{text("units_note")}</Note>
      <ResetButton
        type="button"
        onClick={() => save_instrument_settings(DEFAULT_INSTRUMENT_SETTINGS)}
      >
        {text("reset")}
      </ResetButton>
    </>
  );
}
