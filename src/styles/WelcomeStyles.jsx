import styled from "styled-components";

import CoolStyles from "../utils/ui/styles/CoolStyles.jsx";
import { BACKGROUND_FIELD_GRADIENT } from "./BackgroundStyles.jsx";

/** Shared layout styles for the welcome page scaffold. */
export class WelcomeStyles {
  static Wrapper = styled(CoolStyles.Block)`
    background: ${BACKGROUND_FIELD_GRADIENT};
    min-height: 100vh;
    overflow: hidden;
    position: relative;
  `;

  static ImageLayer = styled(CoolStyles.Block)`
    animation: welcome-image-fade-in 0.9s ease-in-out;
    background-position: center;
    background-repeat: no-repeat;
    background-size: 4800px 4800px;
    inset: 0;
    opacity: 0.9;
    position: absolute;

    @keyframes welcome-image-fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 0.9;
      }
    }
  `;

  static PreviousImageLayer = styled(CoolStyles.Block)`
    background-position: center;
    background-repeat: no-repeat;
    background-size: 4800px 4800px;
    inset: 0;
    opacity: 0.9;
    position: absolute;
  `;

  static Content = styled(CoolStyles.Block)`
    left: 50%;
    position: absolute;
    text-align: center;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(90vw, 42rem);
    z-index: 1;
  `;

  static Title = styled(CoolStyles.Block)`
    ${CoolStyles.align_center}
    ${CoolStyles.noselect}
    ${CoolStyles.uppercase}
    color: white;
    font-family: monospace;
    font-size: 5rem;
    font-weight: normal;
    letter-spacing: 5px;
    line-height: 3rem;
    margin-bottom: 0.25rem;
    text-shadow:
      rgb(0, 0, 0) -1px -1px 0px,
      rgb(0, 0, 0) 1px -1px 0px,
      rgb(0, 0, 0) -1px 1px 0px,
      rgb(0, 0, 0) 2px 2px 0px,
      rgba(0, 0, 0, 0.75) 0.25rem 0.25rem 0.5rem;
    transform: scale(1, 0.65);
  `;

  static StartButton = styled.button`
    ${CoolStyles.pointer}
    ${CoolStyles.noselect}
    text-transform: uppercase;
    padding: 0.25rem 1rem;
    font-size: 0.85rem;
    letter-spacing: 5px;
    opacity: 0.5;
    background: rgb(34, 51, 68);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
    font-weight: bold;

    &:hover {
      opacity: 1;
    }
  `;

  static InfoBox = styled(CoolStyles.Block)`
    text-align: center;
    position: fixed;
    background-color: rgb(248, 248, 248);
    padding: 0.5rem 1rem;
    transition: opacity 0.5s ease-in-out;
    border-radius: 0.25rem;
    border: 1px solid black;
    box-shadow: rgba(0, 0, 0, 0.25) 10px 10px 20px;
    color: #222222;
    font-size: 1rem;
    font-style: italic;
    line-height: 1.5;
    left: 50%;
    max-width: 34rem;
    top: calc(50% + 4rem);
    transform: translateX(-50%);
    width: 350px;
    z-index: 2;
  `;
}

export default WelcomeStyles;
