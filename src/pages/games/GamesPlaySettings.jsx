import { useEffect, useState } from "react";
import styled from "styled-components";
import Switch from "@mui/material/Switch";
import AppSettings from "../../AppSettings.jsx";
import AppText from "../../AppText.jsx";
import {
  KEY_GAMES_PLAY_FULL_SCREEN,
  KEY_GAMES_PLAY_CANVAS_SHAPE,
  KEY_GAMES_PLAY_FISHEYE_STRENGTH,
  KEY_GAMES_PLAY_HAZE,
  KEY_GAMES_PLAY_CONTROLLER,
  KEY_GAMES_PLAY_CONTROLLER_COLOR,
} from "../../settings/GamesSettings.jsx";
import {
  KEY_GAMES_PLAY_DISPLAY,
  KEY_GAMES_PLAY_CONTROLLERS,
  KEY_GAMES_PLAY_CONTROLLER_LABEL,
  KEY_GAMES_PLAY_CONTROLLER_ON_SCREEN,
  KEY_GAMES_PLAY_CONTROLLER_KEYBOARD,
  KEY_GAMES_PLAY_CONTROLLER_HAND_HELD,
  KEY_GAMES_PLAY_FULL_SCREEN_LABEL,
  KEY_GAMES_PLAY_FULL_SCREEN_ERROR,
  KEY_GAMES_PLAY_FULL_SCREEN_UNAVAILABLE,
  KEY_GAMES_PLAY_CONTROLLER_COLOR_LABEL,
  CONTROLLER_COLOR_TEXT,
  FLIGHT_SCENE_TEXT,
} from "../../text/GamesText.jsx";
import {
  CONTROLLER_COLORS,
  normalize_controller_color,
} from "./controllers/ControllerColors.js";
import FlightInstrumentSettingsPanel from "./flight/FlightInstrumentSettingsPanel.jsx";
import DashboardBackgroundSetting from "./DashboardBackgroundSetting.jsx";
import { useCanvasShape } from "./useCanvasDisplay.js";
import { useFisheyeStrength } from "./useFisheye.js";
import { useAtmosphere } from "./useAtmosphere.js";
import {
  fisheye_slider_value,
  fisheye_strength_for_slider,
} from "./flight/FlightLens.js";
import FlightControlSettingsPanel from "./controllers/FlightControlSettingsPanel.jsx";
import { FLIGHT_SETTINGS_TEXT } from "../../text/GamesText.jsx";

const CONTROLLER_OPTIONS = [
  { value: "on_screen", label: KEY_GAMES_PLAY_CONTROLLER_ON_SCREEN },
  { value: "keyboard", label: KEY_GAMES_PLAY_CONTROLLER_KEYBOARD },
  { value: "hand_held", label: KEY_GAMES_PLAY_CONTROLLER_HAND_HELD },
];

const SettingsSection = styled.details`
  --section-label-indent: 1.25rem;
  margin-top: 0.5rem;
  border-bottom: 1px solid #cccccc;

  > summary {
    position: relative;
    padding: 0.5rem 0 0.5rem var(--section-label-indent);
    list-style: none;
    cursor: pointer;
    font-weight: bold;

    &::-webkit-details-marker {
      display: none;
    }

    &::before {
      content: "";
      position: absolute;
      left: 0.25rem;
      top: 50%;
      width: 0.375rem;
      height: 0.375rem;
      border-right: 2px solid currentColor;
      border-bottom: 2px solid currentColor;
      transform: translateY(-50%) rotate(-45deg);
    }
  }

  &[open] > summary::before {
    transform: translateY(-50%) rotate(45deg);
  }
`;

const ToggleItem = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.25rem 0 0.25rem var(--section-label-indent);
  cursor: pointer;

  > select {
    padding: 0.375rem 0.5rem;
  }
`;
const LensField = styled(ToggleItem)`
  flex-wrap: nowrap;
  white-space: nowrap;
  > output {
    margin-left: auto;
    flex-shrink: 0;
    min-width: 2.5em;
    text-align: right;
  }
  > input {
    flex: 0 1 7rem;
    width: 7rem;
    min-width: 0;
    margin: 0;
  }
`;

export default function GamesPlaySettings({ fullscreen_target_ref }) {
  const canvas_shape = useCanvasShape();
  const fisheye_strength = useFisheyeStrength();
  const haze_percent = useAtmosphere();
  const lens_level = fisheye_slider_value(fisheye_strength);
  const [controller_color, set_controller_color] = useState(() =>
    normalize_controller_color(
      AppSettings.get(KEY_GAMES_PLAY_CONTROLLER_COLOR),
    ),
  );
  const [controller, set_controller] = useState(() => {
    const saved = AppSettings.get(KEY_GAMES_PLAY_CONTROLLER);
    return CONTROLLER_OPTIONS.some((option) => option.value === saved)
      ? saved
      : "on_screen";
  });
  const [full_screen, set_full_screen] = useState(
    () =>
      !!fullscreen_target_ref.current &&
      document.fullscreenElement === fullscreen_target_ref.current,
  );
  const [changing, set_changing] = useState(false);
  const [error, set_error] = useState(false);
  const supported = !!document.fullscreenEnabled;

  useEffect(() => {
    const sync_fullscreen = () => {
      const active =
        !!fullscreen_target_ref.current &&
        document.fullscreenElement === fullscreen_target_ref.current;
      set_full_screen(active);
      AppSettings.on_settings_changed({
        [KEY_GAMES_PLAY_FULL_SCREEN]: active,
      });
    };
    // A saved value cannot enter fullscreen without a fresh user gesture.
    AppSettings.on_settings_changed({
      [KEY_GAMES_PLAY_FULL_SCREEN]:
        !!fullscreen_target_ref.current &&
        document.fullscreenElement === fullscreen_target_ref.current,
    });
    document.addEventListener("fullscreenchange", sync_fullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", sync_fullscreen);
  }, [fullscreen_target_ref]);

  const change_fullscreen = async (_, checked) => {
    set_changing(true);
    set_error(false);
    try {
      const target = fullscreen_target_ref.current;
      if (checked && document.fullscreenElement !== target) {
        await target.requestFullscreen();
      } else if (!checked && document.fullscreenElement === target && target) {
        await document.exitFullscreen();
      }
    } catch {
      set_error(true);
    } finally {
      const active =
        !!fullscreen_target_ref.current &&
        document.fullscreenElement === fullscreen_target_ref.current;
      set_full_screen(active);
      AppSettings.on_settings_changed({
        [KEY_GAMES_PLAY_FULL_SCREEN]: active,
      });
      set_changing(false);
    }
  };

  return (
    <>
      <SettingsSection>
        <summary>{AppText.get(KEY_GAMES_PLAY_DISPLAY)}</summary>
        <ToggleItem>
          {AppText.get(KEY_GAMES_PLAY_FULL_SCREEN_LABEL)}
          <Switch
            checked={full_screen}
            disabled={changing || (!supported && !full_screen)}
            onChange={change_fullscreen}
          />
        </ToggleItem>
        <ToggleItem>
          {AppText.get(FLIGHT_SCENE_TEXT.mode)}
          <select
            value={canvas_shape}
            onChange={(event) =>
              AppSettings.on_settings_changed({
                [KEY_GAMES_PLAY_CANVAS_SHAPE]: event.target.value,
              })
            }
          >
            <option value="cinema">
              {AppText.get(FLIGHT_SCENE_TEXT.cinema)}
            </option>
            <option value="porthole">
              {AppText.get(FLIGHT_SCENE_TEXT.porthole)}
            </option>
          </select>
        </ToggleItem>
        <ToggleItem>
          {AppText.get(KEY_GAMES_PLAY_CONTROLLER_COLOR_LABEL)}
          <select
            value={controller_color}
            onChange={(event) => {
              const value = normalize_controller_color(event.target.value);
              set_controller_color(value);
              AppSettings.on_settings_changed({
                [KEY_GAMES_PLAY_CONTROLLER_COLOR]: value,
              });
            }}
          >
            {CONTROLLER_COLORS.map((color) => (
              <option key={color} value={color}>
                {AppText.get(CONTROLLER_COLOR_TEXT[color])}
              </option>
            ))}
          </select>
        </ToggleItem>
        <DashboardBackgroundSetting />
        {(!supported || error) && (
          <p role="status">
            {AppText.get(
              error
                ? KEY_GAMES_PLAY_FULL_SCREEN_ERROR
                : KEY_GAMES_PLAY_FULL_SCREEN_UNAVAILABLE,
            )}
          </p>
        )}
      </SettingsSection>
      <SettingsSection>
        <summary>{AppText.get(FLIGHT_SCENE_TEXT.effects)}</summary>
        <LensField>
          {AppText.get(FLIGHT_SCENE_TEXT.fisheye)}
          <output>{Math.round(lens_level)}%</output>
          <input
            type="range"
            aria-label={AppText.get(FLIGHT_SCENE_TEXT.fisheye)}
            aria-valuetext={`${Math.round(lens_level)}%`}
            min={0}
            max={100}
            step={0.1}
            value={lens_level}
            onChange={(event) =>
              AppSettings.on_settings_changed({
                [KEY_GAMES_PLAY_FISHEYE_STRENGTH]: fisheye_strength_for_slider(
                  Number(event.target.value),
                ),
              })
            }
          />
        </LensField>
        <LensField>
          {AppText.get(FLIGHT_SCENE_TEXT.haze)}
          <output>{Math.round(haze_percent)}%</output>
          <input
            type="range"
            aria-label={AppText.get(FLIGHT_SCENE_TEXT.haze)}
            aria-valuetext={`${Math.round(haze_percent)}%`}
            min={0}
            max={100}
            step={1}
            value={haze_percent}
            onChange={(event) =>
              AppSettings.on_settings_changed({
                [KEY_GAMES_PLAY_HAZE]: Number(event.target.value),
              })
            }
          />
        </LensField>
      </SettingsSection>
      <SettingsSection>
        <summary>{AppText.get(FLIGHT_SETTINGS_TEXT.instruments)}</summary>
        <FlightInstrumentSettingsPanel />
      </SettingsSection>
      <SettingsSection>
        <summary>{AppText.get(KEY_GAMES_PLAY_CONTROLLERS)}</summary>
        <ToggleItem>
          {AppText.get(KEY_GAMES_PLAY_CONTROLLER_LABEL)}
          <select
            value={controller}
            onChange={(event) => {
              const value = event.target.value;
              set_controller(value);
              AppSettings.on_settings_changed({
                [KEY_GAMES_PLAY_CONTROLLER]: value,
              });
            }}
          >
            {CONTROLLER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {AppText.get(option.label)}
              </option>
            ))}
          </select>
        </ToggleItem>
        <FlightControlSettingsPanel />
      </SettingsSection>
    </>
  );
}
