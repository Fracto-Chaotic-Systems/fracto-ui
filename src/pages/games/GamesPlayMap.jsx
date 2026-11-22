import { useEffect, useRef } from "react";
import styled from "styled-components";
import { parchment_grid_lines } from "./GamesPlayMap.js";
import GamesPlayMapMarker from "./GamesPlayMapMarker.jsx";
import GamesPlayMapRaster from "./GamesPlayMapRaster.jsx";
import { bind_parchment_roll } from "./ParchmentMotion.js";
import ParchmentSuspension from "./ParchmentSuspension.jsx";
import { parchment_string_path } from "./ParchmentSuspension.js";
import ParchmentNameplate from "./ParchmentNameplate.jsx";

const MapMount = styled.figure`
  position: absolute;
  right: ${({ $above }) => ($above ? "auto" : "calc(100% + 28px)")};
  left: ${({ $above, $left }) => ($above ? `${$left}px` : "auto")};
  bottom: ${({ $above }) => ($above ? "calc(100% + 48px)" : "12px")};
  transform: translateY(-65px);
  box-sizing: border-box;
  width: ${({ $width }) => $width}px;
  aspect-ratio: 1;
  margin: 0;
  pointer-events: none;
`;

const Parchment = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  transform: rotate(var(--parchment-roll, 0deg));
  transform-origin: 50% 50%;
`;

const ScrollBackground = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(270deg);
  /* The rotation turns this offset into an 18px right, 24px down cast shadow. */
  filter: drop-shadow(-24px 18px 20px #00000080);
`;

const Chart = styled.div`
  position: absolute;
  top: 50%;
  left: 16%;
  width: 68%;
  transform: translateY(-50%);
  overflow: hidden;
`;

const RasterLayer = styled.div`
  position: relative;
  isolation: isolate;
  mix-blend-mode: multiply;

  canvas {
    position: relative;
    width: 100%;
    height: auto;
  }
`;

const Grid = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
`;

const GRID_LINES = parchment_grid_lines();

export default function GamesPlayMap({
  width_px,
  dock_width,
  dock_height,
  height_px,
  flight_state,
}) {
  // The dashboard's rim extends 28px beyond its controls. Fill the remaining
  // horizontal space to the viewport edge instead of capping the scroll size.
  const side_space = (width_px - dock_width) / 2 - 28;
  const above = side_space < 96;
  const width = above
    ? Math.min(200, width_px - 32, height_px - dock_height - 96)
    : side_space;
  const parchment_ref = useRef(null);
  const suspension_ref = useRef(null);
  useEffect(() => {
    if (!parchment_ref.current) return;
    const strings = suspension_ref.current?.querySelectorAll("polyline") ?? [];
    return bind_parchment_roll(parchment_ref.current, flight_state, (angle) => {
      const points = parchment_string_path(angle);
      strings.forEach((string) => string.setAttribute("points", points));
    });
  }, [flight_state, width]);
  if (width < 96) return null;

  return (
    <MapMount
      role="group"
      aria-label="Mandelbrot Set chart on curled parchment, with a grid in the escape regions"
      $width={width}
      $above={above}
      $left={(dock_width - width_px) / 2 + 16}
    >
      <Parchment ref={parchment_ref}>
        <ScrollBackground src="/images/10-transparent.png" alt="" />
        <Chart>
          <RasterLayer>
            <Grid
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {GRID_LINES.map(({ axis, value, major, half, position_pct }) => (
                <line
                  key={`${axis}-${value}`}
                  x1={axis === "re" ? position_pct : 0}
                  x2={axis === "re" ? position_pct : 100}
                  y1={axis === "im" ? position_pct : 0}
                  y2={axis === "im" ? position_pct : 100}
                  stroke="#785b38"
                  strokeOpacity={major ? 0.65 : half ? 0.4 : 0.25}
                  strokeWidth={major ? 1.25 : half ? 0.85 : 0.65}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </Grid>
            <GamesPlayMapRaster display_width={width * 0.68} />
          </RasterLayer>
          <GamesPlayMapMarker flight_state={flight_state} />
        </Chart>
      </Parchment>
      <ParchmentSuspension suspension_ref={suspension_ref} />
      <ParchmentNameplate />
    </MapMount>
  );
}
