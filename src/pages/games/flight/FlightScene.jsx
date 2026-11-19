import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import AppText from "../../../AppText.jsx";
import { FLIGHT_SCENE_TEXT } from "../../../text/GamesText.jsx";
import { create_flight_frame_client } from "./FlightFrameClient.js";
import { start_flight_scene } from "./FlightSceneRuntime.js";
import { DEFAULT_FLIGHT_FISHEYE_STRENGTH } from "./FlightProjection.js";
import FlightCasing from "./FlightCasing.jsx";
import { DEFAULT_FLIGHT_HAZE_PERCENT } from "./FlightAtmosphere.js";
import {
  flight_scene_layout,
  FLIGHT_FRAME_RIM_PX,
  FLIGHT_FRAME_TOP_PX,
  FLIGHT_FRAME_BOTTOM_PX,
} from "./FlightSceneLayout.js";

const SceneViewport = styled.div`
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: auto;
`;
const SceneCanvas = styled.canvas`
  width: 100%;
  height: 100%;
  border-radius: ${({ $mode }) => ($mode === "porthole" ? "50%" : "8px")};
  margin: 0 auto;
  display: block;
  pointer-events: none;
  background: #91bede;
`;
const SceneMount = styled.div`
  position: relative;
  box-sizing: border-box;
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
  padding: ${({ $ready }) => ($ready ? FLIGHT_FRAME_RIM_PX : 0)}px;
  margin: ${FLIGHT_FRAME_TOP_PX}px auto ${FLIGHT_FRAME_BOTTOM_PX}px;
  visibility: ${({ $ready }) => ($ready ? "visible" : "hidden")};
  pointer-events: none;
`;
// Static glass highlights stay outside the numerical rendering/frame loop.
const PortholeGlass = styled.div`
  position: absolute;
  inset: ${FLIGHT_FRAME_RIM_PX}px;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(
    circle closest-side,
    transparent 86%,
    #e6f6ff08 92%,
    #e6f6ff1c 97%,
    #effaff38 100%
  );
  box-shadow: inset 0 0 5px #18313c1a;
  &::after {
    content: "";
    position: absolute;
    inset: 12px;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      transparent 0deg 105deg,
      #e4f5ff47 135deg,
      transparent 165deg 270deg,
      #f4fbff80 310deg,
      transparent 355deg
    );
    mask-image: radial-gradient(
      circle closest-side,
      transparent 94%,
      #000 97.5%,
      transparent 100%
    );
  }
`;
const SceneError = styled.div`
  position: absolute;
  top: 1rem;
  left: 1rem;
  max-width: calc(100% - 5rem);
  padding: 0.5rem 0.75rem;
  background: #fffffff0;
  color: #333333;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  button {
    margin-left: 0.5rem;
  }
`;

export default function FlightScene({
  flight_state,
  width_px,
  height_px,
  display_mode = "640x480",
  fisheye_strength = DEFAULT_FLIGHT_FISHEYE_STRENGTH,
  haze_percent = DEFAULT_FLIGHT_HAZE_PERCENT,
  create_client = create_flight_frame_client,
  on_frame,
}) {
  const {
    mode,
    glass_width_px,
    glass_height_px,
    frame_width_px,
    frame_height_px,
  } = flight_scene_layout(width_px, height_px, display_mode);
  const ready = glass_width_px > 0 && glass_height_px > 0;
  const canvas_ref = useRef(null),
    runtime_ref = useRef(null);
  const [failed, set_failed] = useState(false),
    [attempt, set_attempt] = useState(0);
  useEffect(() => {
    const runtime = start_flight_scene(canvas_ref.current, flight_state, {
      create_client,
      on_frame,
      on_error: () => set_failed(true),
    });
    runtime_ref.current = runtime;
    return () => {
      runtime.destroy();
      runtime_ref.current = null;
    };
  }, [flight_state, create_client, on_frame, attempt]);
  useEffect(() => {
    runtime_ref.current?.resize(
      glass_width_px,
      glass_height_px,
      mode,
      fisheye_strength,
      haze_percent,
    );
  }, [
    glass_width_px,
    glass_height_px,
    mode,
    fisheye_strength,
    haze_percent,
    attempt,
    flight_state,
    create_client,
    on_frame,
  ]);
  return (
    <>
      <SceneViewport>
        <SceneMount
          $width={frame_width_px}
          $height={frame_height_px}
          $ready={ready}
        >
          <SceneCanvas
            $mode={mode}
            ref={canvas_ref}
            role="img"
            aria-label={AppText.get(FLIGHT_SCENE_TEXT.view)}
          />
          {ready && mode === "porthole" && <PortholeGlass aria-hidden="true" />}
          {ready && (
            <FlightCasing
              shape={mode === "porthole" ? "porthole" : "cinema"}
              width={frame_width_px}
              height={frame_height_px}
            />
          )}
        </SceneMount>
      </SceneViewport>
      {failed && (
        <SceneError role="alert">
          {AppText.get(FLIGHT_SCENE_TEXT.error)}
          <button
            type="button"
            onClick={() => {
              set_failed(false);
              set_attempt((value) => value + 1);
            }}
          >
            {AppText.get(FLIGHT_SCENE_TEXT.retry)}
          </button>
        </SceneError>
      )}
    </>
  );
}
