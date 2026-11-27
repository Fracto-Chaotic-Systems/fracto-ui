import styled from "styled-components";

const Lamp = styled.span`
  position: absolute;
  z-index: 1;
  left: ${({ $left }) => $left}px;
  top: ${({ $top }) => $top}px;
  transform: translate(-50%, -50%);
  box-sizing: border-box;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border: 2px solid transparent;
  border-radius: 50%;
  pointer-events: none;
  background:
    ${({ $on }) =>
      $on
        ? "radial-gradient(circle at 35% 28%, #dcffb8 0%, #7df25d 24%, #26ae38 62%, #075c20 100%)"
        : "radial-gradient(circle at 35% 28%, #426342 0%, #1d3b25 38%, #0b2013 100%)"}
      padding-box,
    linear-gradient(
        145deg,
        #f4f0df,
        #b5b3aa 30%,
        #565a57 55%,
        #c9c8bc 78%,
        #777b73
      )
      border-box;
  box-shadow:
    inset 0 1px 2px #0009,
    1px 2px 3px #100b09b3,
    ${({ $on }) => ($on ? "0 0 8px 2px #58ef6270, 0 0 18px 4px #43de4030" : "0 0 0 0 #58ef6200, 0 0 0 0 #43de4000")};
  transition: box-shadow 160ms ease;
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export default function AutoPilotIndicator({
  enabled,
  label,
  left_px,
  top_px,
  size_px,
}) {
  return (
    <Lamp
      role="img"
      aria-label={label}
      title={label}
      $on={enabled}
      $left={left_px}
      $top={top_px}
      $size={size_px}
    />
  );
}
