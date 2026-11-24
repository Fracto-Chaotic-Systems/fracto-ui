import styled from "styled-components";
import { InventoryViewport } from "./InventoryStyles.jsx";

export const StageWorkspace = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  grid-template-rows: minmax(360px, 1fr);
  gap: 1rem;
  overflow: auto;
  input {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  @media (max-width: 750px) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(360px, 1fr) auto;
  }
`;

export const StageViewport = styled(InventoryViewport)`
  min-width: 0;
  min-height: 360px;
`;
export const StagePreviewNotice = styled.div`
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  right: 1rem;
  padding: 0.7rem;
  border: 1px solid #8ba9a0;
  border-radius: 4px;
  background: #fffffff0;
  font-size: 0.875rem;
  pointer-events: none;
`;

export const SavedComponentList = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
  max-height: 150px;
  overflow: auto;
  font-size: 0.875rem;
  button {
    padding: 0.35rem 0.5rem;
    cursor: pointer;
  }
`;
