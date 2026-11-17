import styled, { css } from "styled-components";

const cap_letter_image = (letter = "") => {
  const escaped = letter.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  return `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="12" viewBox="0 0 9 12"><g text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="400"><text x="5" y="10" fill="#1f2c38" fill-opacity="0.95">${escaped}</text><text x="4.5" y="9.5" fill="white">${escaped}</text></g></svg>`,
  )}")`;
};

const rail = css`
  height: 4px;
  box-sizing: border-box;
  border: 1px solid #a5afb9;
  border-top-color: #596675;
  border-radius: 2px;
  background: #cbd2da;
  box-shadow:
    inset 0 1px 1px #65738266,
    0 1px 0 #ffffffb3;
`;

const cap = css`
  width: 11px;
  height: 14px;
  box-sizing: border-box;
  border: 1px solid #4e5965;
  border-radius: 2px;
  background: #929eab;
  background-image: ${({ $cap_letter }) => cap_letter_image($cap_letter)};
  background-position: center;
  background-repeat: no-repeat;
  box-shadow: 0 1px 2px #14202d80;
  cursor: ew-resize;
`;

// Retain native range input semantics, dragging and keyboard controls.
export const MidiFader = styled.input.attrs({ type: "range" })`
  appearance: none;
  -webkit-appearance: none;
  display: block;
  height: 16px;
  padding: 0;
  border: 0;
  border-radius: 2px;
  background: repeating-linear-gradient(
      to right,
      #8794a1 0 1px,
      transparent 1px 12.5%
    )
    center bottom / calc(100% - 11px) 3px no-repeat;
  cursor: pointer;
  &[data-center-marker="true"] {
    background:
      linear-gradient(#345d8c, #345d8c) center / 2px 100% no-repeat,
      repeating-linear-gradient(to right, #8794a1 0 1px, transparent 1px 12.5%)
        center bottom / calc(100% - 11px) 3px no-repeat;
  }
  &::-webkit-slider-runnable-track {
    ${rail}
  }
  &::-moz-range-track {
    ${rail}
  }
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    margin-top: -6px;
    ${cap}
  }
  &::-moz-range-thumb {
    ${cap}
  }
  &:hover::-webkit-slider-thumb {
    border-color: #263e56;
  }
  &:hover::-moz-range-thumb {
    border-color: #263e56;
  }
  &[data-centered="true"]::-webkit-slider-thumb {
    border-color: #345d8c;
    box-shadow: 0 0 0 1px #345d8c;
  }
  &[data-centered="true"]::-moz-range-thumb {
    border-color: #345d8c;
    box-shadow: 0 0 0 1px #345d8c;
  }
  &:focus-visible {
    outline: 2px solid #345d8c;
    outline-offset: 1px;
  }
`;
