import styled from "styled-components";
import {
  TRACK_LABEL_WIDTH,
  TRACK_ROW_HEIGHT,
  TRACK_RULER_HEIGHT,
} from "./MidiTrackGeometry.js";

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
  background: #eef1f4;
  box-sizing: border-box;
  padding: 8px 12px;
  border-right: 1px solid #c5ccd2;
  border-bottom: 1px solid #c5ccd2;
  font-size: 0.8rem;
`;
export const TrackRow = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: ${TRACK_ROW_HEIGHT}px;
  display: grid;
  grid-template-columns: ${TRACK_LABEL_WIDTH}px 1fr;
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
  background: #f0f2f4;
  border: 0;
  border-right: 1px solid #c5ccd2;
  border-bottom: 1px solid #dce1e5;
  cursor: pointer;
  overflow: hidden;
  &[aria-pressed="true"] {
    background: #dce9f5;
    box-shadow: inset 3px 0 #386fa0;
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
`;
export const TrackCell = styled.div`
  min-width: 0;
  canvas {
    display: block;
    position: sticky;
    left: ${TRACK_LABEL_WIDTH}px;
  }
`;
export const TrackDetails = styled.p`
  font-size: 0.8rem;
  line-height: 1.5;
  min-height: 1.5rem;
`;
