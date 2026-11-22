import styled from "styled-components";
import {
  PARCHMENT_NAIL,
  parchment_string_path,
} from "./ParchmentSuspension.js";

const StringLayer = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  z-index: 0;
  pointer-events: none;
  filter: drop-shadow(1px 2px 1px #22190c66);
`;

const Nail = styled.span`
  position: absolute;
  left: ${PARCHMENT_NAIL.x}%;
  top: ${PARCHMENT_NAIL.y}%;
  width: 8px;
  height: 8px;
  transform: translate(-50%, -50%);
  z-index: 2;
  border-radius: 50%;
  border: 1px solid #39352f;
  background: radial-gradient(
    circle at 30% 25%,
    #d4d1c7,
    #77766d 40%,
    #343732 80%
  );
  box-shadow:
    2px 3px 3px #00000080,
    inset 0 0 1px #eee9da;
  pointer-events: none;

  &::before {
    content: "";
    position: absolute;
    width: 2px;
    height: 6px;
    top: 5px;
    left: 3px;
    background: #44433b;
    transform: rotate(-12deg);
  }
`;

const REST_PATH = parchment_string_path();

export default function ParchmentSuspension({ suspension_ref }) {
  return (
    <>
      <StringLayer
        ref={suspension_ref}
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <polyline
          points={REST_PATH}
          fill="none"
          stroke="#302314"
          strokeWidth="3.2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={REST_PATH}
          fill="none"
          stroke="#bda174"
          strokeWidth="1.8"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={REST_PATH}
          fill="none"
          stroke="#f2dfb6"
          strokeWidth="0.55"
          strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
        />
      </StringLayer>
      <Nail aria-hidden="true" />
    </>
  );
}
