import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styled from "styled-components";
import AppText from "../../AppText.jsx";
import { KEY_WELCOME_TITLE } from "../../text/WelcomeText.jsx";
import { WelcomeStyles } from "../../styles/WelcomeStyles.jsx";
import { watch_intro_title_cue } from "./GamesPlayIntroTitleCue.js";

const Anchor = styled.div`
  position: absolute;
  left: 50%;
  top: calc(50% - 1rem);
  width: 0;
  height: 0;
  z-index: 4;
  pointer-events: none;
`;
const Title = styled(WelcomeStyles.Title)`
  position: absolute;
  left: 0;
  top: 0;
  width: max-content;
  margin: 0;
  line-height: 1;
  padding-left: 5px; /* Balance the splash font's trailing letter spacing. */
  transform-origin: 50% 100%;
  transform: translate(-50%, -100%) scale(0);
`;

function VisibleTitle({ width_px, opacity }) {
  const label = useRef(null);
  useLayoutEffect(() => {
    const node = label.current;
    const natural_width = node?.offsetWidth;
    if (natural_width) {
      const scale = (width_px * 0.5) / natural_width;
      node.style.transform = `translate(-50%, -100%) scale(${scale}, ${scale * 0.65})`;
    }
  }, [width_px]);
  return (
    <Anchor style={{ opacity }}>
      <Title ref={label} role="heading" aria-level={2}>
        {AppText.get(KEY_WELCOME_TITLE)}
      </Title>
    </Anchor>
  );
}

export default function GamesPlayIntroTitle({ audio_ref, width_px }) {
  const [opacity, set_opacity] = useState(0);
  useEffect(
    () => watch_intro_title_cue(audio_ref.current, set_opacity),
    [audio_ref],
  );
  return opacity > 0 ? (
    <VisibleTitle width_px={width_px} opacity={opacity} />
  ) : null;
}
