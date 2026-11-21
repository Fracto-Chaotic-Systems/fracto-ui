import { useSyncExternalStore } from "react";
import styled from "styled-components";
import { flight_map_marker } from "./GamesPlayMap.js";

const Marker = styled.svg`
  position: absolute;
  width: 20px;
  height: 20px;
  overflow: visible;
  filter: drop-shadow(0 1px 2px #28170dcc);
`;

// Subscribe here so telemetry moves only the marker, leaving the raster static.
export default function GamesPlayMapMarker({ flight_state }) {
  const state = useSyncExternalStore(
    flight_state.subscribe,
    flight_state.get_snapshot,
    flight_state.get_snapshot,
  );
  const marker = flight_map_marker(state);
  if (!marker) return null;
  const label = `Player${marker.off_map ? " outside chart" : " position"}, heading ${Math.round(marker.heading_deg)}°`;
  return (
    <Marker
      viewBox="0 0 24 24"
      role="img"
      aria-label={label}
      style={{
        left: `clamp(12px, ${marker.x_pct}%, calc(100% - 12px))`,
        top: `clamp(12px, ${marker.y_pct}%, calc(100% - 12px))`,
        transform: `translate(-50%, -50%) rotate(${marker.heading_deg}deg)`,
      }}
    >
      <title>{label}</title>
      {marker.off_map && (
        <circle
          cx="12"
          cy="12"
          r="13"
          fill="none"
          stroke="#000000"
          strokeWidth="1.5"
          strokeDasharray="2 2"
        />
      )}
      <path
        d="M12 1 L22 22 L12 17 L2 22 Z"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </Marker>
  );
}
