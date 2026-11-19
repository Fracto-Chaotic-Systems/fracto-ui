import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import AppText from "../../../AppText.jsx";
import { FLIGHT_SCENE_TEXT } from "../../../text/GamesText.jsx";
import { create_flight_frame_client } from "./FlightFrameClient.js";
import { start_flight_scene } from "./FlightSceneRuntime.js";
import { DEFAULT_FLIGHT_FISHEYE_STRENGTH } from "./FlightProjection.js";

const SceneViewport = styled.div`
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: ${({ $fixed }) => ($fixed ? "auto" : "hidden")};
`;
const SceneCanvas = styled.canvas`
  width: ${({ $fixed }) => ($fixed ? "640px" : "100%")};
  height: ${({ $fixed }) => ($fixed ? "480px" : "100%")};
  margin: 0 auto;
  display: block;
  pointer-events: none;
  background: #91bede;
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
  display_mode = "fill",
  fisheye_strength = DEFAULT_FLIGHT_FISHEYE_STRENGTH,
  create_client = create_flight_frame_client,
  on_frame,
}) {
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
      width_px,
      height_px,
      display_mode,
      fisheye_strength,
    );
  }, [
    width_px,
    height_px,
    display_mode,
    fisheye_strength,
    attempt,
    flight_state,
    create_client,
    on_frame,
  ]);
  return (
    <>
      <SceneViewport $fixed={display_mode === "640x480"}>
        <SceneCanvas
          $fixed={display_mode === "640x480"}
          ref={canvas_ref}
          role="img"
          aria-label={AppText.get(FLIGHT_SCENE_TEXT.view)}
        />
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
