import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import AppText from "../../AppText.jsx";
import { PLAY_FLOW_TEXT } from "../../text/GamesText.jsx";
import {
  sample_play_prelude,
  start_play_prelude,
} from "./GamesPlayPreludeTimeline.js";

const Prelude = styled.section`
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  color: #111111;
  background: #ffffff;
  cursor: pointer;
  outline: none;
`;
const Word = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  white-space: nowrap;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 20px;
  line-height: 1;
  font-weight: 400;
`;
const To = styled(Word)`
  top: calc(50% + clamp(3rem, 6vw, 5rem));
  font-size: 14px;
`;
const Chaos = styled(Word)`
  top: calc(50% + clamp(6rem, 12vw, 10rem));
  font-size: clamp(48px, 12vw, 160px);
  font-weight: 700;
  letter-spacing: 0.18em;
  padding-left: 0.18em;
`;
const RetryAudio = styled.button`
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.75rem 1rem;
  cursor: pointer;
`;

export default function GamesPlayPrelude({
  on_complete,
  on_tv_reveal,
  on_prepare = () => {},
  audio_ref,
  audio_error = false,
}) {
  const host = useRef(null);
  const [elapsed, set_elapsed] = useState(0);
  useEffect(() => {
    host.current?.focus();
    let revealed = false,
      preparing = false;
    return start_play_prelude((seconds) => {
      const sample = sample_play_prelude(seconds);
      set_elapsed(seconds);
      if (seconds >= 0.8 && !preparing) {
        preparing = true;
        on_prepare();
      }
      if (sample.tv_visible && !revealed) {
        revealed = true;
        on_tv_reveal();
      }
      if (sample.complete) on_complete();
    }, audio_ref.current);
  }, [on_complete, on_tv_reveal, on_prepare, audio_ref]);
  const sample = sample_play_prelude(elapsed);
  return (
    <Prelude
      ref={host}
      role="button"
      tabIndex={0}
      aria-label={AppText.get(PLAY_FLOW_TEXT.skip)}
      style={{ background: sample.tv_visible ? "transparent" : "#ffffff" }}
    >
      <Word
        aria-hidden={sample.welcome_opacity === 0}
        style={{
          opacity: sample.welcome_opacity,
          letterSpacing: `${sample.welcome_spacing_em}em`,
          paddingLeft: `${sample.welcome_spacing_em}em`,
        }}
      >
        {AppText.get(PLAY_FLOW_TEXT.welcome)}
      </Word>
      <To
        aria-hidden={sample.to_opacity === 0}
        style={{ opacity: sample.to_opacity }}
      >
        {AppText.get(PLAY_FLOW_TEXT.to)}
      </To>
      <Chaos
        aria-hidden={sample.chaos_opacity === 0}
        style={{ opacity: sample.chaos_opacity }}
      >
        {AppText.get(PLAY_FLOW_TEXT.chaos)}
      </Chaos>
      {audio_error && (
        <RetryAudio type="button">
          {AppText.get(PLAY_FLOW_TEXT.audio_retry)}
        </RetryAudio>
      )}
    </Prelude>
  );
}
