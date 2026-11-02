import styled from "styled-components";

export const MusicPanel = styled.section`
  padding: 1.25rem;
  max-width: 80rem;
  box-sizing: border-box;
  margin: 0 auto;
  overflow-wrap: anywhere;
`;
export const MusicControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin: 1.25rem 0;
`;
export const MusicButton = styled.button`
  font: inherit;
  padding: 0.5rem 1rem;
  border: 1px solid #888;
  border-radius: 3px;
  background: #f6f6f6;
  color: #222;
  cursor: pointer;
  &:hover:enabled {
    background: #e8e8e8;
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid #345d8c;
    outline-offset: 2px;
  }
`;
export const MusicError = styled.p`
  color: #a32121;
`;
export const MusicProgress = styled.output`
  font-family: monospace;
  font-variant-numeric: tabular-nums;
`;
