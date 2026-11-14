import { useEffect, useState } from "react";
import styled from "styled-components";
import Switch from "@mui/material/Switch";
import AppSettings from "../../AppSettings.jsx";
import AppText from "../../AppText.jsx";
import { KEY_GAMES_PLAY_FULL_SCREEN } from "../../settings/GamesSettings.jsx";
import {
  KEY_GAMES_PLAY_DISPLAY,
  KEY_GAMES_PLAY_FULL_SCREEN_LABEL,
  KEY_GAMES_PLAY_FULL_SCREEN_ERROR,
  KEY_GAMES_PLAY_FULL_SCREEN_UNAVAILABLE,
} from "../../text/GamesText.jsx";

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
`;

export default function GamesPlaySettings({ fullscreen_target_ref }) {
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
  );
}
