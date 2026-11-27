import styled from "styled-components";
import { dashboard_nameplate } from "./DashboardNameplate.js";

const SwitchMount = styled.div`
  position: absolute;
  ${({ $side }) => $side}: calc(2px + 0.5rem);
  top: ${({ $top }) => $top}px;
  width: ${({ $width }) => $width}px;
  text-align: center;
  pointer-events: auto;
`;

const SwitchPlate = styled.span`
  ${dashboard_nameplate}
  padding: 0 calc(10px + 0.5rem);
  display: block;
  width: max-content;
  margin-top: 3px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
`;

const Toggle = styled.button`
  position: relative;
  display: block;
  width: ${({ $width }) => $width}px;
  height: ${({ $width }) => ($width * 4) / 3}px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  /* Two photographic states share one transparent sprite: left off, right on.
     Crop the transparent margins in CSS without adding an opaque button face. */
  background-image: url("/dashboard/night-flight-switch.png");
  background-repeat: no-repeat;
  background-size: ${({ $width }) => ($width * 8) / 3}px auto;
  background-position: ${({ $on, $width }) =>
    `${(($on ? -51 : -8) * $width) / 36}px ${(-9 * $width) / 36}px`};
  background-color: transparent;
  filter: drop-shadow(2px 3px 2px #000b);
  cursor: pointer;
  touch-action: manipulation;
  &:focus-visible {
    outline: 2px solid #ffcf83;
    outline-offset: 3px;
  }
`;

export default function DashboardSwitch({
  enabled,
  on_change,
  label,
  caption,
  night = false,
  side = "left",
  top_px = 0,
  width_px = 54,
}) {
  return (
    <SwitchMount $top={top_px} $side={side} $width={width_px}>
      <Toggle
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        title={label}
        $on={enabled}
        $width={width_px}
        onClick={() => on_change(!enabled)}
      />
      <SwitchPlate aria-hidden="true" $night={night}>
        {caption}
      </SwitchPlate>
    </SwitchMount>
  );
}
