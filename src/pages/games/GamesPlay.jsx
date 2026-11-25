import { useEffect, useId, useRef, useState } from "react";
import styled from "styled-components";
import Drawer from "@mui/material/Drawer";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faXmark } from "@fortawesome/free-solid-svg-icons";
import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import AppSettings from "../../AppSettings.jsx";
import CoolSplitter, {
  SPLITTER_LAYOUT_FLOW,
  SPLITTER_TYPE_VERTICAL,
} from "../../utils/ui/CoolSplitter.jsx";
import { SPLITTER_WIDTH_PX } from "../../constants.jsx";
import { KEY_GAMES_PLAY_SETTINGS_POSITION } from "../../settings/GamesSettings.jsx";
import GamesPlaySettings from "./GamesPlaySettings.jsx";
import GamesPlayControls from "./GamesPlayControls.jsx";
import GamesCrt from "./GamesCrt.jsx";
import GamesPlayGrass from "./GamesPlayGrass.jsx";
import screen_media from "virtual:crt-screen-media";
import { create_controller_input } from "./controllers/ControllerInput.js";
import {
  create_flight_controls,
  bind_flight_controls,
} from "./controllers/FlightControls.js";
import {
  read_flight_control_settings,
  subscribe_flight_control_settings,
} from "./controllers/useFlightControlSettings.js";
import {
  create_flight_state,
  INITIAL_FLIGHT_STATE,
} from "./flight/FlightState.js";
import { start_flight_simulation } from "./flight/FlightSimulation.js";
import FlightScene from "./flight/FlightScene.jsx";
import { useCanvasShape } from "./useCanvasDisplay.js";
import { useFisheyeStrength } from "./useFisheye.js";
import { useAtmosphere } from "./useAtmosphere.js";
import {
  MAX_SETTINGS_POSITION,
  MIN_SETTINGS_POSITION,
  settings_drawer_layout,
} from "./GamesPlaySettingsLayout.js";
import {
  KEY_GAMES_PLAY_TITLE,
  KEY_GAMES_PLAY_SETTINGS,
  KEY_GAMES_PLAY_SETTINGS_TITLE,
  KEY_GAMES_PLAY_SETTINGS_CLOSE,
} from "../../text/GamesText.jsx";

const PlayPanel = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;

  > ${styles.SectionTitle} {
    flex-shrink: 0;
  }
`;

const DEFAULT_CRT_CONTENT = { playlist: screen_media };

const PlayContent = styled.div`
  position: relative;
  isolation: isolate;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background-color: #554e36;

  &:fullscreen {
    width: 100vw;
    height: 100vh;
    max-width: none;
    max-height: none;
    margin: 0;
    flex: none;
  }
`;

const CornerTv = styled.div`
  position: absolute;
  top: 0;
  left: -50px;
  z-index: 0;
  width: clamp(425px, 67.5%, 725px);
  max-width: calc(125% - 3.75rem);
  aspect-ratio: 1.25;
  pointer-events: none;

  > div {
    height: 100%;
  }

  button {
    pointer-events: auto;
  }
`;

const SettingsIcon = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: 0.25rem;
  background: transparent;
  color: #666666;
  font-size: 1.25rem;

  &:hover,
  &:focus-visible {
    background: #eeeeee;
    color: #444444;
  }
`;

const SettingsToggle = styled(SettingsIcon)`
  z-index: 1;
  color: #444444;

  &:hover,
  &:focus-visible {
    background: #00000010;
    color: #222222;
  }

  /* Closed: the gear sits over the scene, so it is white, drawn as an outline
     that fills in on hover or focus. Font Awesome Free has no outlined gear, so
     the solid gear's path is stroked instead of filled. Open: the close icon
     sits over the light drawer and keeps the dark colors above. */
  &[aria-expanded="false"] {
    color: #ffffff;

    svg {
      overflow: visible;
    }

    path {
      fill: transparent;
      stroke: currentColor;
      stroke-width: 40;
      stroke-linejoin: round;
      transition: fill 120ms ease;
    }

    &:hover,
    &:focus-visible {
      background: #ffffff26;
      color: #ffffff;

      path {
        fill: currentColor;
      }
    }
  }
`;

const SettingsContent = styled.div`
  position: relative;
  box-sizing: border-box;
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: auto;
  padding: 0.5rem;
  color: #444444;
`;

const SettingsHeading = styled.h2`
  margin: 0;
  padding-right: 2rem;
`;

export default function GamesPlay({ crt_content } = {}) {
  const canvas_shape = useCanvasShape();
  const fisheye_strength = useFisheyeStrength();
  const haze_percent = useAtmosphere();
  // Input, mapped commands, and telemetry have separate per-page lifetimes.
  const [game_input] = useState(create_controller_input);
  const [flight_controls] = useState(create_flight_controls);
  useEffect(
    () =>
      bind_flight_controls(game_input, flight_controls, {
        read_settings: read_flight_control_settings,
        subscribe_settings: subscribe_flight_control_settings,
      }),
    [game_input, flight_controls],
  );
  const [flight_state] = useState(() =>
    create_flight_state(INITIAL_FLIGHT_STATE),
  );
  useEffect(
    () => start_flight_simulation(flight_state, flight_controls),
    [flight_state, flight_controls],
  );
  const [settings_open, set_settings_open] = useState(false);
  const content_ref = useRef(null);
  const gear_ref = useRef(null);
  const [content_bounds, set_content_bounds] = useState({
    width: 0,
    height: 0,
  });
  const [saved_position, set_saved_position] = useState(() =>
    AppSettings.get(KEY_GAMES_PLAY_SETTINGS_POSITION),
  );
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      set_content_bounds({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(content_ref.current);
    return () => observer.disconnect();
  }, []);
  const layout = settings_drawer_layout(content_bounds.width, saved_position);
  const resize_settings = (position) => {
    if (!Number.isFinite(position)) return;
    const bounded = Math.min(
      MAX_SETTINGS_POSITION,
      Math.max(MIN_SETTINGS_POSITION, position),
    );
    set_saved_position(bounded);
    AppSettings.on_settings_changed({
      [KEY_GAMES_PLAY_SETTINGS_POSITION]: bounded,
    });
  };
  const drawer_id = useId();
  const heading_id = useId();
  const close_settings = () => {
    set_settings_open(false);
    gear_ref.current?.focus();
  };

  return (
    <PlayPanel>
      <styles.SectionTitle>
        {AppText.get(KEY_GAMES_PLAY_TITLE)}
      </styles.SectionTitle>
      <PlayContent ref={content_ref}>
        <GamesPlayGrass
          width_px={content_bounds.width}
          height_px={content_bounds.height}
        />
        <FlightScene
          display_mode={canvas_shape === "porthole" ? "porthole" : "640x480"}
          fisheye_strength={fisheye_strength}
          haze_percent={haze_percent}
          flight_state={flight_state}
          width_px={content_bounds.width}
          height_px={content_bounds.height}
        />
        <GamesPlayControls
          input={game_input}
          flight_controls={flight_controls}
          flight_state={flight_state}
          width_px={content_bounds.width}
          height_px={content_bounds.height}
        />
        <CornerTv>
          <GamesCrt screen_content={crt_content ?? DEFAULT_CRT_CONTENT} />
        </CornerTv>
        <SettingsToggle
          ref={gear_ref}
          type="button"
          title={AppText.get(
            settings_open
              ? KEY_GAMES_PLAY_SETTINGS_CLOSE
              : KEY_GAMES_PLAY_SETTINGS,
          )}
          aria-label={AppText.get(
            settings_open
              ? KEY_GAMES_PLAY_SETTINGS_CLOSE
              : KEY_GAMES_PLAY_SETTINGS,
          )}
          aria-expanded={settings_open}
          aria-controls={settings_open ? drawer_id : undefined}
          aria-haspopup="dialog"
          onClick={() => set_settings_open((open) => !open)}
        >
          <FontAwesomeIcon icon={settings_open ? faXmark : faGear} />
        </SettingsToggle>
        <ClickAwayListener
          onClickAway={(event) => {
            if (settings_open && !gear_ref.current?.contains(event.target)) {
              set_settings_open(false);
            }
          }}
        >
          <Drawer
            variant="persistent"
            anchor="right"
            open={settings_open}
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 0,
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                close_settings();
              }
            }}
            slotProps={{
              paper: {
                id: drawer_id,
                role: "dialog",
                "aria-labelledby": heading_id,
                style: {
                  position: "absolute",
                  width: layout.width,
                  maxWidth: "100%",
                  height: "100%",
                  flexDirection: "row",
                  overflow: "hidden",
                  pointerEvents: "auto",
                },
              },
            }}
          >
            {settings_open && content_bounds.width > 0 && (
              <CoolSplitter
                type={SPLITTER_TYPE_VERTICAL}
                layout={SPLITTER_LAYOUT_FLOW}
                name={KEY_GAMES_PLAY_SETTINGS_POSITION}
                bar_width_px={SPLITTER_WIDTH_PX}
                container_bounds={content_bounds}
                position={layout.position * content_bounds.width}
                min_position={MIN_SETTINGS_POSITION * content_bounds.width}
                max_position={MAX_SETTINGS_POSITION * content_bounds.width}
                on_change={(position) =>
                  resize_settings(position / content_bounds.width)
                }
              />
            )}
            <SettingsContent>
              <SettingsHeading id={heading_id}>
                {AppText.get(KEY_GAMES_PLAY_SETTINGS_TITLE)}
              </SettingsHeading>
              <GamesPlaySettings fullscreen_target_ref={content_ref} />
            </SettingsContent>
          </Drawer>
        </ClickAwayListener>
      </PlayContent>
    </PlayPanel>
  );
}
