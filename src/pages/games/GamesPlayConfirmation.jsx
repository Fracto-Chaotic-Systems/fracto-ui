import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import AppText from "../../AppText.jsx";
import { PLAY_FLOW_TEXT } from "../../text/GamesText.jsx";
import { start_confirmation_prompt } from "./GamesPlayConfirmationTiming.js";
import "./GamesPlayConfirmation.css";

const Prompt = styled.button`
  position: absolute;
  z-index: 4;
  bottom: clamp(1.5rem, 4vh, 3rem);
  left: 50%;
  transform: translateX(-50%);
  padding: 0.5rem;
  border: 0;
  background: transparent;
  color: white;
  font:
    italic 42px/1.3 "Fracto Pinyon Script",
    "Apple Chancery",
    cursive;
  letter-spacing: 0.14em;
  animation: confirmation-arrival 2.5s ease-out both;
  white-space: nowrap;
  text-shadow:
    0 1px 2px #000d,
    0 0 4px #000a;
  cursor: pointer;
  &:focus-visible {
    outline: 1px solid #ffffff66;
    outline-offset: 2px;
  }
`;

export default function GamesPlayConfirmation({ on_confirm }) {
  const [alternate, set_alternate] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    return start_confirmation_prompt(set_alternate);
  }, []);
  return (
    <Prompt
      ref={ref}
      type="button"
      aria-label={AppText.get(PLAY_FLOW_TEXT.confirm)}
      onClick={on_confirm}
    >
      <span aria-hidden="true">
        {AppText.get(
          PLAY_FLOW_TEXT[alternate ? "confirm_your_will" : "confirm_at_will"],
        )}
      </span>
    </Prompt>
  );
}
