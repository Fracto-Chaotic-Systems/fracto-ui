import styled from "styled-components";
import AppText from "../../AppText.jsx";
import { PARCHMENT_PLATE_TEXT } from "../../text/GamesText.jsx";

const Plate = styled.figcaption`
  position: absolute;
  top: calc(100% + 4px - 2rem);
  left: 19.6%;
  width: 60.8%;
  box-sizing: border-box;
  padding: 12px 10px 9px;
  container-type: inline-size;
  border: 1px solid #4b514b;
  border-radius: 4px;
  background:
    radial-gradient(ellipse at 8% 18%, #6a4e3038, transparent 40%),
    radial-gradient(ellipse at 92% 84%, #3d462d45, transparent 38%),
    radial-gradient(circle, #242c2028 0 0.6px, transparent 1px) 0 0 / 7px 11px,
    radial-gradient(circle, #e2dfc514 0 0.6px, transparent 1px) 3px 5px / 11px
      13px,
    repeating-linear-gradient(
      0deg,
      #ffffff00 0 1px,
      #ffffff08 1px 2px,
      #00000010 2px 3px
    ),
    repeating-linear-gradient(96deg, transparent 0 36px, #33382c20 37px 38px),
    linear-gradient(135deg, #a5a698, #999d8f 55%, #898f80);
  box-shadow:
    inset 0 1px 0 #fffdf02b,
    inset 0 -1px 2px #353b3280,
    3px 6px 8px #00000066;
  color: #242b27;
  text-align: center;
  text-shadow: 0 1px 0 #ffffff30;
  pointer-events: none;
`;

const Name = styled.div`
  font-family: monospace;
  font-size: clamp(9px, 25cqw, 34px);
  font-weight: normal;
  line-height: 1;
  /* WelcomeStyles.Title uses 5px tracking at 80px and the same height scaling. */
  letter-spacing: 0.0625em;
  text-indent: 0.0625em;
  transform: scale(1, 0.65);
`;

const Tagline = styled.div`
  margin-top: 2px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(4px, 10cqw, 14px);
  font-style: italic;
  letter-spacing: 0.08em;
  line-height: 1.25;
  white-space: nowrap;
`;

const Established = styled.div`
  margin-top: 2px;
  font-family: "Courier New", monospace;
  font-size: clamp(5px, 9cqw, 12px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.08em;
`;

const Rivet = styled.span`
  position: absolute;
  top: ${({ $bottom }) => ($bottom ? "auto" : "5px")};
  bottom: ${({ $bottom }) => ($bottom ? "5px" : "auto")};
  left: ${({ $right }) => ($right ? "auto" : "5px")};
  right: ${({ $right }) => ($right ? "5px" : "auto")};
  width: 8px;
  height: 8px;
  border: 1px solid #555c50;
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 25%,
    #bcbba4,
    #858c7b 45%,
    #444d42 85%
  );
  box-shadow:
    0 1px 2px #00000080,
    inset 0 1px 0 #fffce733;
`;

const CORNERS = [
  [false, false],
  [true, false],
  [false, true],
  [true, true],
];

export default function ParchmentNameplate() {
  return (
    <Plate>
      {CORNERS.map(([right, bottom], index) => (
        <Rivet key={index} $right={right} $bottom={bottom} aria-hidden="true" />
      ))}
      <Name>{AppText.get(PARCHMENT_PLATE_TEXT.name)}</Name>
      <Tagline>{AppText.get(PARCHMENT_PLATE_TEXT.tagline)}</Tagline>
      <Established>{AppText.get(PARCHMENT_PLATE_TEXT.established)}</Established>
    </Plate>
  );
}
