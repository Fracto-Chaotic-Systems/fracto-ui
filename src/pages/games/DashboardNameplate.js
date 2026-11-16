import { css } from "styled-components";

// Shared finish for instrument captions and the smaller lighting-switch plate.
export const dashboard_nameplate = css`
  position: relative;
  box-sizing: border-box;
  height: 16px;
  padding: 0 10px;
  border: 1px solid #514d43;
  border-radius: 3px;
  background:
    repeating-linear-gradient(
      0deg,
      #ffffff00 0px,
      #ffffff00 1px,
      #ffffff24 2px,
      #0000000d 3px
    ),
    linear-gradient(175deg, #f5f1e4, #b6b1a2 48%, #dfdacc 52%, #9b9587);
  box-shadow:
    inset 0 1px 0 #ffffffbf,
    inset 0 -1px 0 #59534580,
    2px 2px 2px #180d09d9;
  color: #292823;
  text-shadow: 0 1px 0 #ffffff99;
  font-family: Arial, sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  line-height: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  ${({ $night }) =>
    $night &&
    css`
      background: linear-gradient(175deg, #554b38, #26251e);
      color: #ffd094;
      text-shadow: 0 0 4px #ffad5860;
      border-color: #514b3c;
    `}
  &::before, &::after {
    content: "";
    position: absolute;
    top: 5px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: radial-gradient(
      circle at 30% 25%,
      #fffdf3,
      #aaa494 45%,
      #49463d
    );
    box-shadow:
      0 0 0 1px #655f50,
      0 1px 1px #ffffff80;
  }
  &::before {
    left: 3px;
  }
  &::after {
    right: 3px;
  }
`;
