import styled from "styled-components";
import Switch from "@mui/material/Switch";
import AppText from "../../../AppText.jsx";
import {
  CONTROL_INPUT_TEXT,
  CONTROL_CHANNEL_TEXT,
  CONTROL_SETTINGS_TEXT,
  FLIGHT_CONTROL_ACTION_TEXT,
} from "../../../text/GamesText.jsx";
import {
  CONTROL_AXES,
  CONTROL_BUTTONS,
  CONTROL_CHANNELS,
  CONTROL_ACTIONS,
  DEFAULT_FLIGHT_CONTROL_SETTINGS,
} from "./FlightControlSettings.js";
import {
  useFlightControlSettings,
  save_flight_control_settings,
} from "./useFlightControlSettings.js";

const Group = styled.details`
  margin: 0.5rem 0 0.5rem var(--section-label-indent, 1.25rem);
  > summary {
    cursor: pointer;
    padding: 0.375rem 0;
    font-weight: 600;
  }
`;
const Row = styled.label`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.375rem 0;
  > select {
    min-width: 0;
    max-width: 100%;
    padding: 0.375rem 0.5rem;
  }
  > input[type="range"] {
    min-width: 0;
    width: 100%;
  }
`;
const AxisCard = styled.div`
  padding-bottom: 0.375rem;
  border-bottom: 1px solid #eeeeee;
`;
const Note = styled.p`
  margin-left: var(--section-label-indent, 1.25rem);
  font-size: 0.75rem;
  line-height: 1.4;
  color: #666666;
`;
const ResetButton = styled.button`
  margin: 0.5rem 0 0.75rem var(--section-label-indent, 1.25rem);
  padding: 0.375rem 0.5rem;
  max-width: calc(100% - 1.25rem);
`;
const text = (code) => AppText.get(CONTROL_SETTINGS_TEXT[code]);

export default function FlightControlSettingsPanel() {
  const settings = useFlightControlSettings();
  return (
    <>
      <Group open>
        <summary>{text("response")}</summary>
        <Row>
          {text("invert_pitch")}
          <Switch
            checked={settings.invert_pitch}
            onChange={(_, invert_pitch) =>
              save_flight_control_settings({ invert_pitch })
            }
          />
        </Row>
        <Row>
          <span>{text("dead_zone")}</span>
          <output>{Math.round(settings.dead_zone * 100)}%</output>
          <input
            type="range"
            aria-label={text("dead_zone")}
            min={0}
            max={0.9}
            step={0.01}
            value={settings.dead_zone}
            onChange={(event) =>
              save_flight_control_settings({
                dead_zone: Number(event.target.value),
              })
            }
          />
        </Row>
        <Row>
          <span>{text("sensitivity")}</span>
          <output>{settings.sensitivity.toFixed(1)}×</output>
          <input
            type="range"
            aria-label={text("sensitivity")}
            min={0.1}
            max={3}
            step={0.1}
            value={settings.sensitivity}
            onChange={(event) =>
              save_flight_control_settings({
                sensitivity: Number(event.target.value),
              })
            }
          />
        </Row>
      </Group>
      <Group>
        <summary>{text("axes")}</summary>
        {CONTROL_AXES.map((code) => (
          <AxisCard key={code}>
            <Row>
              <span>{AppText.get(CONTROL_INPUT_TEXT[code])}</span>
              <select
                value={settings.axes[code]}
                onChange={(event) =>
                  save_flight_control_settings({
                    axes: { [code]: event.target.value },
                  })
                }
              >
                {["none", ...CONTROL_CHANNELS].map((channel) => (
                  <option key={channel} value={channel}>
                    {AppText.get(CONTROL_CHANNEL_TEXT[channel])}
                  </option>
                ))}
              </select>
            </Row>
            <Row>
              <span>{text("invert_axis")}</span>
              <input
                type="checkbox"
                aria-label={text("axis_inversion_label").replace(
                  "{axis}",
                  AppText.get(CONTROL_INPUT_TEXT[code]),
                )}
                checked={settings.axis_inverted[code]}
                onChange={(event) =>
                  save_flight_control_settings({
                    axis_inverted: { [code]: event.target.checked },
                  })
                }
              />
            </Row>
          </AxisCard>
        ))}
      </Group>
      <Group>
        <summary>{text("buttons")}</summary>
        {CONTROL_BUTTONS.map((code) => (
          <Row key={code}>
            <span>{AppText.get(CONTROL_INPUT_TEXT[code])}</span>
            <select
              value={settings.buttons[code]}
              onChange={(event) =>
                save_flight_control_settings({
                  buttons: { [code]: event.target.value },
                })
              }
            >
              {CONTROL_ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {AppText.get(FLIGHT_CONTROL_ACTION_TEXT[action])}
                </option>
              ))}
            </select>
          </Row>
        ))}
      </Group>
      <Note>{text("note")}</Note>
      <ResetButton
        type="button"
        onClick={() =>
          save_flight_control_settings(DEFAULT_FLIGHT_CONTROL_SETTINGS)
        }
      >
        {text("reset")}
      </ResetButton>
    </>
  );
}
