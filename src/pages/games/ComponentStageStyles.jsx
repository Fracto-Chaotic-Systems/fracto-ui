import styled from "styled-components";
import { InventoryViewport } from "./InventoryStyles.jsx";

export const StageWorkspace = styled.div`
  flex: 1;
  min-height: 0;
  display: ${({ $hidden }) => ($hidden ? "none" : "grid")};
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
    grid-template-rows: minmax(360px, 1fr) minmax(180px, auto);
  }
`;

export const StageViewport = styled(InventoryViewport)`
  min-width: 0;
  min-height: 360px;
`;
export const StageLightingBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.75rem;
  padding: 0.6rem 0.8rem;
  border: 1px solid #d7dfe1;
  border-radius: 6px;
  background: #f7f9f9;
  &[hidden] {
    display: none;
  }
  label {
    flex: 1 1 220px;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  output {
    font-variant-numeric: tabular-nums;
  }
  input {
    width: 100%;
    margin: 0;
  }
`;
export const VariantButton = styled.button`
  width: 100%;
  padding: 0.6rem;
  text-align: left;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 4px;
  &[aria-pressed="true"] {
    background: #dceef2;
    border-color: #427e8a;
    font-weight: 700;
  }
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

export const StageViewButtons = styled.nav`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  button {
    padding: 0.5rem 0.75rem;
    cursor: pointer;
  }
  button[aria-pressed="true"] {
    background: #e8eef0;
    border-color: #427e8a;
    font-weight: 600;
  }
`;
export const ConstructionDocumentStyles = styled.section`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 0.5rem;
  &[hidden] {
    display: none;
  }
  header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  h3 {
    margin: 0;
    margin-right: auto;
  }
  p {
    margin: 0.25rem 0;
  }
  button {
    padding: 0.4rem 0.7rem;
    cursor: pointer;
  }
  button[aria-pressed="true"] {
    font-weight: 600;
    border-color: #427e8a;
  }
  textarea {
    flex: 1;
    min-height: 300px;
    width: 100%;
    box-sizing: border-box;
    padding: 1rem;
    resize: vertical;
    font:
      0.95rem/1.5 ui-monospace,
      Consolas,
      monospace;
    border: 1px solid #bdc9cc;
    border-radius: 6px;
  }
  small {
    align-self: flex-end;
  }
`;
export const ConstructionDocumentBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 1rem;
  border: 1px solid #bdc9cc;
  border-radius: 6px;
`;
