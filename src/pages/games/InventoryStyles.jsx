import styled from "styled-components";

export const InventoryLayout = styled.div`
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 0 1rem 0.5rem;
  max-width: 1500px;
  p {
    line-height: 1.5;
  }
`;
export const InventoryToolbar = styled.div`
  margin: 1rem 0;
  > button {
    padding: 0.5rem 0.65rem;
    cursor: pointer;
  }
`;
export const InventoryWorkspace = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: grid;
  grid-template-rows: minmax(440px, 1fr);
  grid-template-columns: 240px minmax(0, 1fr) 245px;
  gap: 1rem;
  @media (max-width: 1100px) {
    grid-template-columns: 210px minmax(0, 1fr);
    > aside {
      grid-column: 2;
    }
  }
  @media (max-width: 650px) {
    grid-template-columns: minmax(0, 1fr);
    > aside {
      grid-column: auto;
    }
  }
`;
/** Fills the preview and details columns, e.g. the components page's construction stage. */
export const InventoryContent = styled.div`
  grid-column: 2 / -1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
  @media (max-width: 650px) {
    grid-column: auto;
  }
`;
export const InventoryAssetList = styled.nav`
  align-self: stretch;
  min-height: 0;
  overflow: auto;
  padding: 1rem 0.65rem;
  border-right: 1px solid #ccd4d6;
  font-size: 0.875rem;
  @media (max-width: 650px) {
    border-right: 0;
    border-bottom: 1px solid #ccd4d6;
  }
`;
export const InventoryTreeHost = styled.div`
  width: 100%;
  min-width: 0;
  height: clamp(260px, 58vh, 740px);
`;
export const InventoryViewport = styled.div`
  position: relative;
  flex: 0 0 55%;
  min-height: 180px;
  box-sizing: border-box;
  background: #e8eef0;
  border: 1px solid #bdc9cc;
  border-radius: 6px;
  overflow: hidden;
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
  canvas:focus-visible {
    outline: 3px solid #427e8a;
    outline-offset: -3px;
  }
`;
export const InventoryPreviewPane = styled.div`
  position: relative;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;
export const InventoryDetails = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  scrollbar-gutter: stable;
  padding-right: 0.35rem;
  &:focus-visible {
    outline: 2px solid #427e8a;
    outline-offset: -2px;
  }
`;
export const InventoryStatus = styled.div`
  position: absolute;
  left: 1rem;
  right: 1rem;
  top: 1rem;
  padding: 0.65rem;
  background: #ffffffed;
  border-radius: 4px;
  font-size: 0.875rem;
`;
export const InventoryControls = styled.aside`
  align-self: stretch;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #ccd4d6;
  border-radius: 6px;
  background: #f5f7f7;
  font-size: 0.875rem;
  label {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }
  input[type="range"],
  select {
    width: 100%;
  }
  output {
    margin-left: auto;
    font-variant-numeric: tabular-nums;
  }
  button {
    padding: 0.5rem;
    cursor: pointer;
  }
`;
export const InventoryCaption = styled.p`
  color: #52636a;
  font-size: 0.8rem;
`;

export const TreeActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0.5rem 0;
  button {
    cursor: pointer;
    padding: 0.3rem 0.5rem;
  }
`;
export const TreeActionForm = styled.form`
  margin: 0.65rem 0;
  padding: 0.6rem;
  border: 1px solid #ccd4d6;
  border-radius: 4px;
  overflow-wrap: anywhere;
  label {
    display: grid;
    gap: 0.35rem;
    margin: 0.5rem 0;
  }
  input {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
`;

/**
 * The "in: <folder>" line (or its editor) under the name row in a right panel:
 * half the panel gap above it, slightly indented.
 */
export const InventoryFolderLine = styled.div`
  margin-top: -0.5rem;
  padding-left: 0.75rem;
  > form {
    margin: 0;
  }
`;
export const InventoryNameRow = styled.div`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  .inventory-delete-action {
    margin-left: auto;
    visibility: hidden;
    pointer-events: none;
  }
  &:hover .inventory-delete-action,
  &:focus-within .inventory-delete-action {
    visibility: visible;
    pointer-events: auto;
  }
  strong {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  input {
    flex: 1;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
    font: inherit;
    padding: 0.2rem 0.35rem;
  }
`;
