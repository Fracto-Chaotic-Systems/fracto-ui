import styled from "styled-components";

export const TerrainPanel = styled.div`
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #17212b;
  color: #f2f4f6;
`;
export const TerrainOptionsToggle = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid #8093a5;
  border-radius: 4px;
  color: #f2f4f6;
  background: #17212b;
  font-size: 18px;
  cursor: pointer;
  &:hover {
    background: #2b3e50;
  }
  &:focus-visible {
    outline: 2px solid #64c8cc;
    outline-offset: 2px;
  }
`;
export const TerrainOptions = styled.div`
  flex-shrink: 0;
  max-height: 65%;
  overflow: auto;
  padding-right: 48px;
  &[hidden] {
    display: none;
  }
`;
export const TerrainToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px;
  button {
    cursor: pointer;
  }
  label {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  form {
    display: flex;
    align-items: center;
    gap: 4px;
  }
`;
export const TerrainHost = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
`;
export const TerrainLightingControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 0 8px 8px;
  label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
  }
  input[type="range"] {
    width: 90px;
  }
  output {
    min-width: 38px;
    font-family: monospace;
  }
`;
export const TerrainMessage = styled.div`
  padding: 0 8px 8px;
  font-size: 12px;
`;
export const TerrainProgress = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
  overflow-x: auto;
  padding: 0 8px 8px;
  font-size: 12px;
  span {
    flex-shrink: 0;
    white-space: nowrap;
  }
  progress {
    flex: 0 0 40rem;
    width: 40rem;
    height: 12px;
    accent-color: #64c8cc;
  }
`;
