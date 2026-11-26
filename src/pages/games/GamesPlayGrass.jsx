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
import {
  random_play_traversal_start,
  visible_play_traversal_starts,
} from "./GamesPlayTraversalStart.js";
import {
  PLAY_GRASS_VARIANT,
  play_grass_variant_document,
} from "./GamesPlayGrassVariant.js";

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

export default function GamesPlayGrass({
  width_px,
  height_px,
  introduction = false,
  reveal_limit = 4,
  audio_ref,
  on_prepared,
}) {
  const host = useRef(null),
    runtime = useRef(null),
    size = useRef({ width: width_px, height: height_px }),
    presentation = useRef({ reveal_limit, on_prepared }),
    traversal_start = useRef(null);
  useEffect(() => {
    presentation.current = { reveal_limit, on_prepared };
    runtime.current?.release_introduction(reveal_limit);
  }, [reveal_limit, on_prepared]);
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
      .then(
        ([{ document, source_revision, resolve_materials }, path_motion]) => {
          if (controller.signal.aborted) return;
          const playback_document = play_grass_variant_document(
            document,
            source_revision,
            PLAY_GRASS_RELEASE.variant,
          );
          if (traversal_start.current === null)
            traversal_start.current = random_play_traversal_start({
              candidates: visible_play_traversal_starts(
                playback_document,
                path_motion,
                size.current.width,
                size.current.height,
                PLAY_GRASS_VARIANT.role_groups.walking_insects,
              ),
            });
          scene = create_play_grass_scene(host.current, {
            introduction,
            read_intro_seconds: () => audio_ref?.current?.currentTime ?? 0,
            start_fraction: traversal_start.current,
            on_prepared: () => presentation.current.on_prepared?.(),
            path_motion,
            resolve_materials,
            on_error: () => {
              if (!controller.signal.aborted) set_failed(true);
            },
          });
          runtime.current = scene;
          scene.release_introduction(presentation.current.reveal_limit);
          scene.resize(size.current.width, size.current.height);
          return scene.update(playback_document);
        },
      )
      .catch(() => {
        if (!controller.signal.aborted) set_failed(true);
      });
    return () => {
      controller.abort();
      scene?.dispose();
      runtime.current = null;
    };
  }, [attempt, introduction, audio_ref]);
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
