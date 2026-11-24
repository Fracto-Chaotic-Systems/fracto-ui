import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import AppText from "../../AppText.jsx";
import { PLAY_GRASS_TEXT } from "../../text/GamesText.jsx";
import {
  component_runtime_manifest_url,
  load_component_runtime,
} from "../../utils/render/ComponentRuntimePackage.js";
import { PLAY_GRASS_RELEASE } from "./GamesPlayGrassRelease.js";
import { create_play_grass_scene } from "./GamesPlayGrassScene.js";
import { load_path_motion } from "../../utils/render/TopDownPathCamera.js";

const Background = styled.div`
  position: absolute;
  inset: 0;
  z-index: -2;
  pointer-events: none;
  overflow: hidden;
  canvas {
    width: 100%;
    height: 100%;
  }
`;
const Notice = styled.div`
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  padding: 0.4rem;
  background: #ffffffe6;
  color: #333;
  font-size: 0.8rem;
  button {
    pointer-events: auto;
    margin-left: 0.5rem;
  }
`;

export default function GamesPlayGrass({ width_px, height_px }) {
  const host = useRef(null),
    runtime = useRef(null),
    size = useRef({ width: width_px, height: height_px });
  const [failed, set_failed] = useState(false),
    [attempt, set_attempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let scene;
    Promise.all([
      load_component_runtime(
        component_runtime_manifest_url(
          PLAY_GRASS_RELEASE.key,
          PLAY_GRASS_RELEASE.release,
        ),
        controller.signal,
      ),
      load_path_motion(
        `${import.meta.env.BASE_URL}motions/slow-strip-patrol.json`,
        controller.signal,
      ),
    ])
      .then(([{ document, resolve_materials }, path_motion]) => {
        if (controller.signal.aborted) return;
        scene = create_play_grass_scene(host.current, {
          path_motion,
          resolve_materials,
          on_error: () => {
            if (!controller.signal.aborted) set_failed(true);
          },
        });
        runtime.current = scene;
        scene.resize(size.current.width, size.current.height);
        return scene.update(document);
      })
      .catch(() => {
        if (!controller.signal.aborted) set_failed(true);
      });
    return () => {
      controller.abort();
      scene?.dispose();
      runtime.current = null;
    };
  }, [attempt]);
  useEffect(() => {
    size.current = { width: width_px, height: height_px };
    runtime.current?.resize(width_px, height_px);
  }, [width_px, height_px, attempt]);
  return (
    <Background ref={host} data-play-background="grass-strip">
      {failed && (
        <Notice role="alert">
          {AppText.get(PLAY_GRASS_TEXT.unavailable)}
          <button
            type="button"
            onClick={() => {
              set_failed(false);
              set_attempt((value) => value + 1);
            }}
          >
            {AppText.get(PLAY_GRASS_TEXT.retry)}
          </button>
        </Notice>
      )}
    </Background>
  );
}
