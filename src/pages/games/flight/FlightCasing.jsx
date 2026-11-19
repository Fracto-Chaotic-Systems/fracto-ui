import { useId } from "react";
import styled from "styled-components";

const Casing = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
  filter: drop-shadow(0 6px 7px #281d1059);
`;
const RIVETS = Array.from({ length: 16 }, (_, index) => {
  const angle = (index * Math.PI) / 8;
  return {
    x: 356 + Math.sin(angle) * 338,
    y: 356 - Math.cos(angle) * 338,
  };
});

const rounded_rect = (x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  return `M${x + r} ${y}H${x + width - r}Q${x + width} ${y} ${x + width} ${y + r}V${y + height - r}Q${x + width} ${y + height} ${x + width - r} ${y + height}H${x + r}Q${x} ${y + height} ${x} ${y + height - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
};
const rectangular_rivets = (width, height) => {
  const rivets = [];
  const columns = Math.max(2, Math.round((width - 36) / 112) + 1);
  const side_segments = Math.max(2, Math.round((height - 36) / 112));
  for (let index = 0; index < columns; index++) {
    const x = 18 + (index * (width - 36)) / (columns - 1);
    rivets.push({ x, y: 18 }, { x, y: height - 18 });
  }
  for (let index = 1; index < side_segments; index++) {
    const y = 18 + (index * (height - 36)) / side_segments;
    rivets.push({ x: 18, y }, { x: width - 18, y });
  }
  return rivets;
};

/** Shared brass finish and rivets, outside the glass and flight frame loop. */
export default function FlightCasing({ shape, width, height }) {
  const id = `flight-frame-${useId().replaceAll(":", "")}`;
  const porthole = shape === "porthole";
  const rivets = porthole ? RIVETS : rectangular_rivets(width, height);
  return (
    <Casing
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#78501f" />
          <stop offset="0.12" stopColor="#f3dda1" />
          <stop offset="0.28" stopColor="#b98b3d" />
          <stop offset="0.45" stopColor="#e2bf71" />
          <stop offset="0.62" stopColor="#8a6028" />
          <stop offset="0.8" stopColor="#d1a957" />
          <stop offset="0.93" stopColor="#f1d797" />
          <stop offset="1" stopColor="#68451d" />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0.75" y2="1">
          <stop offset="0" stopColor="#fff0b9" />
          <stop offset="0.3" stopColor="#d4ac59" />
          <stop offset="0.65" stopColor="#654018" />
          <stop offset="1" stopColor="#ad8138" />
        </linearGradient>
        <radialGradient id={`${id}-rivet`} cx="0.3" cy="0.2" r="0.85">
          <stop offset="0" stopColor="#fff1bd" />
          <stop offset="0.35" stopColor="#e5c47e" />
          <stop offset="0.75" stopColor="#a77730" />
          <stop offset="1" stopColor="#63421b" />
        </radialGradient>
      </defs>
      <path
        d={
          porthole
            ? "M356 0a356 356 0 1 1 0 712a356 356 0 1 1 0-712Z M356 36a320 320 0 1 1 0 640a320 320 0 1 1 0-640Z"
            : `${rounded_rect(0, 0, width, height, 24)} ${rounded_rect(36, 36, width - 72, height - 72, 8)}`
        }
        fillRule="evenodd"
        fill={`url(#${id}-brass)`}
      />
      {porthole ? (
        <>
          <circle
            cx="356"
            cy="356"
            r="354.5"
            fill="none"
            stroke="#52391e"
            strokeWidth="3"
          />
          <circle
            cx="356"
            cy="356"
            r="351"
            fill="none"
            stroke={`url(#${id}-edge)`}
            strokeWidth="5"
          />
          <circle
            cx="356"
            cy="356"
            r="345"
            fill="none"
            stroke="#f9df9f73"
            strokeWidth="1"
          />
          <circle
            cx="356"
            cy="356"
            r="327"
            fill="none"
            stroke={`url(#${id}-edge)`}
            strokeWidth="6"
          />
          <circle
            cx="356"
            cy="356"
            r="321.5"
            fill="none"
            stroke="#362a1c"
            strokeWidth="3"
          />
        </>
      ) : (
        <>
          <rect
            x="1.5"
            y="1.5"
            width={width - 3}
            height={height - 3}
            rx="22.5"
            fill="none"
            stroke="#52391e"
            strokeWidth="3"
          />
          <rect
            x="5"
            y="5"
            width={width - 10}
            height={height - 10}
            rx="19"
            fill="none"
            stroke={`url(#${id}-edge)`}
            strokeWidth="5"
          />
          <rect
            x="11"
            y="11"
            width={width - 22}
            height={height - 22}
            rx="13"
            fill="none"
            stroke="#f9df9f73"
            strokeWidth="1"
          />
          <rect
            x="29"
            y="29"
            width={width - 58}
            height={height - 58}
            rx="15"
            fill="none"
            stroke={`url(#${id}-edge)`}
            strokeWidth="6"
          />
          <rect
            x="34.5"
            y="34.5"
            width={width - 69}
            height={height - 69}
            rx="9.5"
            fill="none"
            stroke="#362a1c"
            strokeWidth="3"
          />
        </>
      )}
      {rivets.map(({ x, y }, index) => (
        <g
          key={index}
          transform={`translate(${x} ${y})`}
          data-porthole-rivet=""
        >
          <circle cx="0.6" cy="1.5" r="7" fill="#46301680" />
          <circle
            r="6.5"
            fill={`url(#${id}-rivet)`}
            stroke="#725021"
            strokeWidth="0.9"
          />
          <circle r="4.9" fill="none" stroke="#f4d99466" strokeWidth="0.6" />
          <ellipse cx="-1.5" cy="-2.1" rx="2.2" ry="1.1" fill="#fff6d68c" />
        </g>
      ))}
    </Casing>
  );
}
