import styled from "styled-components";

export const TerrainPanel = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #17212b;
  color: #f2f4f6;
`;
export const TerrainToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px;
  button { cursor: pointer; }
  label { display: flex; align-items: center; gap: 4px; }
`;
export const TerrainHost = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;
  canvas { display: block; width: 100%; height: 100%; touch-action: none; }
`;
export const TerrainMessage = styled.div`
  padding: 0 8px 8px;
  font-size: 12px;
`;
