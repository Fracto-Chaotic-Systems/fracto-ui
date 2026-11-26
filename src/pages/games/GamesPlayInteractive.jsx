import { useEffect, useState } from "react";
import GamesPlayControls from "./GamesPlayControls.jsx";
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

// One mount is one interactive session. Unmount releases input, simulation and UI.
export default function GamesPlayInteractive({ width_px, height_px }) {
  const canvas_shape = useCanvasShape();
  const fisheye_strength = useFisheyeStrength();
  const haze_percent = useAtmosphere();
  const [game_input] = useState(create_controller_input);
  const [flight_controls] = useState(create_flight_controls);
  const [flight_state] = useState(() =>
    create_flight_state(INITIAL_FLIGHT_STATE),
  );
  useEffect(
    () =>
      bind_flight_controls(game_input, flight_controls, {
        read_settings: read_flight_control_settings,
        subscribe_settings: subscribe_flight_control_settings,
      }),
    [game_input, flight_controls],
  );
  useEffect(
    () => start_flight_simulation(flight_state, flight_controls),
    [flight_state, flight_controls],
  );
  return (
    <>
      <FlightScene
        display_mode={canvas_shape === "porthole" ? "porthole" : "640x480"}
        fisheye_strength={fisheye_strength}
        haze_percent={haze_percent}
        flight_state={flight_state}
        width_px={width_px}
        height_px={height_px}
      />
      <GamesPlayControls
        input={game_input}
        flight_controls={flight_controls}
        flight_state={flight_state}
        width_px={width_px}
        height_px={height_px}
      />
    </>
  );
}
