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
    transform: translate(-50%, 0);
    width: min(90vw, 42rem);
    z-index: 1;
  `;

  /** Centered access surface shown over the continuing image animation. */
  static LoginPanel = styled(CoolStyles.Block)`
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(0, 0, 0, 0.35);
    border-radius: 1rem;
    box-sizing: border-box;
    box-shadow: 0.5rem 0.5rem 1.25rem rgba(0, 0, 0, 0.3);
    left: 50%;
    height: 40.45rem;
    padding: 16px;
    position: fixed;
    text-align: center;
    top: 50%;
    transform: translate(-50%, -50%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 1s ease-in-out;
    width: 25rem;
    z-index: 3;

    &[data-login-open="true"] {
      opacity: 1;
      pointer-events: auto;
    }
  `;

  static Title = styled(CoolStyles.Block)`
    ${CoolStyles.align_center}
    ${CoolStyles.noselect}
    ${CoolStyles.uppercase}
    color: white;
    font-family: monospace;
    font-size: 80px;
    font-weight: normal;
    letter-spacing: 5px;
    margin-bottom: 0.25rem;
    text-shadow:
      rgb(0, 0, 0) -1px -1px 0px,
      rgb(0, 0, 0) 1px -1px 0px,
      rgb(0, 0, 0) -1px 1px 0px,
      rgb(0, 0, 0) 2px 2px 0px,
      rgba(0, 0, 0, 0.75) 0.25rem 0.25rem 0.5rem;
    transform: scale(1, 0.65);
  `;

  static TitleLayer = styled(WelcomeStyles.Title)`
    height: 80px;
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -100%) scale(1, 0.65);
    transition:
      top 2.5s ease-in-out,
      transform 2.5s ease-in-out;
    z-index: 4;

    &[data-login-open="true"] {
      top: calc(50% - 20.225rem - 1rem);
      transform: translate(-50%, 0) scale(1, 0.65);
      transition-duration: 1.5s;
    }
  `;

  static StartButton = styled.button`
    ${CoolStyles.pointer}
    ${CoolStyles.noselect}
    box-sizing: border-box;
    height: 24px;
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

  static SubtitleLayer = styled(WelcomeStyles.StartButton)`
    left: 50%;
    position: absolute;
    top: 50%;
    transform: translateX(-50%);
    transition:
      top 2.5s ease-in-out,
      transform 2.5s ease-in-out;
    z-index: 4;

    &[data-login-open="true"] {
      top: calc(50% + 20.225rem - 40px);
      transition-duration: 1.5s;
    }
  `;

  static OIDCPlaceholder = styled(CoolStyles.Block)`
    color: #444444;
    font-size: 0.875rem;
    font-style: italic;
    left: 50%;
    position: absolute;
    text-align: center;
    top: 50%;
    transform: translate(-50%, -50%);
    width: calc(100% - 2rem);
    z-index: 4;
  `;

  static OIDCAction = styled(WelcomeStyles.StartButton)`
    margin-top: 0.75rem;
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

  static AccessMessage = styled(CoolStyles.Block)`
    color: white;
    font-size: 0.95rem;
    font-style: italic;
    margin: 1rem auto 0;
    text-align: center;
    text-shadow: 0.125rem 0.125rem 0.25rem rgba(0, 0, 0, 0.65);
  `;
}

export default WelcomeStyles;
