import styled from "styled-components";
import {
  TRACK_LABEL_WIDTH,
  TRACK_ROW_HEIGHT,
  TRACK_RULER_HEIGHT,
} from "./MidiTrackGeometry.js";

const vertical_groove =
  "linear-gradient(to right, #647483 0 50%, #dce2e7 50% 100%) right / 2px 100% no-repeat";

export const TrackSection = styled.section`
  margin-top: 1.5rem;
  min-width: 0;
`;
export const TrackToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin: 0.75rem 0;
  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  input[type="range"] {
    width: 9rem;
  }
`;
export const TrackViewport = styled.div`
  position: relative;
  overflow: auto;
  width: 100%;
  max-height: 26rem;
  border: 1px solid #aab1b8;
  background: #fff;
  isolation: isolate;
  &:focus-visible {
    outline: 2px solid #345d8c;
    outline-offset: 2px;
  }
`;
export const TrackContent = styled.div`
  position: relative;
  min-height: ${TRACK_RULER_HEIGHT}px;
`;
export const TrackRuler = styled.div`
  position: sticky;
  top: 0;
  height: ${TRACK_RULER_HEIGHT}px;
  display: grid;
  grid-template-columns: ${TRACK_LABEL_WIDTH}px 1fr;
  z-index: 4;
  background: #eef1f4;
`;
export const RulerCorner = styled.div`
  position: sticky;
  left: 0;
  z-index: 5;
  background:
    linear-gradient(to bottom, #647483 0 50%, #dce2e7 50% 100%) bottom / 100%
      2px no-repeat,
    ${vertical_groove},
    #eef1f4;
  box-sizing: border-box;
  height: ${TRACK_RULER_HEIGHT}px;
  min-height: 0;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 0.8rem;
`;
export const TrackRow = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: ${TRACK_ROW_HEIGHT}px;
  display: grid;
  grid-template-columns: ${TRACK_LABEL_WIDTH}px 1fr;
  &[data-strong-divider="true"]::after,
  &[data-row-kind="tempo"]::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    background: linear-gradient(to bottom, #647483 0 50%, #dce2e7 50% 100%);
    z-index: 3;
    pointer-events: none;
  }
  &[data-row-kind="tempo"]::before {
    top: 0;
    bottom: auto;
  }
`;
export const TrackLabel = styled.button`
  position: sticky;
  left: 0;
  z-index: 2;
  height: ${TRACK_ROW_HEIGHT}px;
  box-sizing: border-box;
  text-align: left;
  padding: 8px 12px;
  font: inherit;
  color: #344350;
  background: #eef1f4;
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      ${vertical_groove},
      linear-gradient(135deg, #f6f7f8 0%, #e8ebed 50%, #d2d7dc 100%);
    pointer-events: none;
  }
  border: 0;
  border-bottom: 1px solid #b4bec7;
  cursor: pointer;
  overflow: hidden;
  &[data-selected] {
    padding: 4px 12px;
    cursor: default;
    strong,
    small {
      line-height: 1.2;
    }
    small {
      margin-top: 2px;
    }
  }
  &[aria-pressed="true"],
  &[data-selected="true"] {
    &::after {
      content: "";
      position: absolute;
      inset: 0;
      z-index: -1;
      background: ${vertical_groove}, #dce9f533;
      box-shadow: inset 3px 0 #386fa0;
      pointer-events: none;
    }
  }
  &:focus-visible {
    outline: 2px solid #345d8c;
    outline-offset: -3px;
  }
  strong,
  small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  strong {
    font-size: 0.85rem;
  }
  small {
    font-size: 0.72rem;
    margin-top: 4px;
  }
  &[data-event-lane] {
    display: flex;
    align-items: center;
    padding: 0 12px;
    > div {
      width: 100%;
    }
  }
  &[data-event-lane="tempo"]::before {
    box-shadow:
      inset 0 1px 0 #647483,
      inset 0 2px 0 #dce2e7;
  }
`;
export const TrackCell = styled.div`
  min-width: 0;
  canvas {
    display: block;
    position: sticky;
    left: ${TRACK_LABEL_WIDTH}px;
  }
`;
export const TrackInstrumentSelect = styled.select`
  width: 100%;
  min-width: 0;
  font: inherit;
  font-size: 0.85rem;
`;
export const TrackLabelHeader = styled.div`
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  min-height: 20px;
`;
export const TrackChannelNumber = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  box-sizing: border-box;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 0.72rem;
  font-weight: bold;
  line-height: 1;
`;
export const SustainLabelHeader = styled(TrackLabelHeader)`
  grid-template-columns: max-content max-content minmax(0, 1fr);
  min-height: 20px;
  em {
    font-size: 0.72rem;
    white-space: nowrap;
  }
`;
export const EventLabelHeader = styled(TrackLabelHeader)`
  display: flex;
  height: 100%;
  min-height: 0;
  strong,
  em {
    display: flex;
    align-items: center;
    align-self: stretch;
    margin: 0;
    padding: 0;
    line-height: 1;
  }
  strong {
    flex-shrink: 0;
  }
  em {
    min-width: 0;
    font-size: 0.72rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
export const TrackInstrumentButton = styled.button`
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  &:focus-visible {
    outline: 2px solid #345d8c;
  }
`;
export const TrackMixToggles = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1px;
  margin-left: 24px;
  font-size: 0.72rem;
  font-style: italic;
  text-transform: lowercase;
  line-height: 1;
  label {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    cursor: pointer;
  }
  input {
    margin: 0;
  }
`;
export const TrackDetails = styled.p`
  font-size: 0.8rem;
  line-height: 1.5;
  min-height: 1.5rem;
`;
export const TrackMixSliders = styled.div`
  display: grid;
  gap: 0;
  margin-top: 1px;
  font-size: 0.65rem;
  label {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    padding-left: 24px;
    gap: 0;
    align-items: center;
    height: 16px;
  }
  input {
    width: 100%;
    min-width: 0;
    margin: 0;
  }
`;
