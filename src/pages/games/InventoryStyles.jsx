import styled from "styled-components";

export const InventoryLayout = styled.div`
  padding: 0 1rem 1.5rem;
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
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) 245px;
  gap: 1rem;
  @media (max-width: 1100px) {
    grid-template-columns: 170px minmax(0, 1fr);
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
export const InventoryAssetList = styled.nav`
  align-self: stretch;
  padding: 1rem 0.65rem;
  border-right: 1px solid #ccd4d6;
  font-size: 0.875rem;
  ul {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0;
  }
  li + li {
    margin-top: 0.4rem;
  }
  @media (max-width: 650px) {
    border-right: 0;
    border-bottom: 1px solid #ccd4d6;
  }
`;
export const InventoryAssetButton = styled.button`
  display: block;
  width: 100%;
  padding: 0.75rem;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #3d565b;
  text-align: left;
  font: inherit;
  cursor: pointer;
  &:hover {
    background: #eef3f4;
  }
  &[aria-pressed="true"] {
    border-color: #a5bec6;
    background: #e2edf0;
    color: #244b58;
    font-weight: 600;
  }
  &:focus-visible {
    outline: 2px solid #427e8a;
    outline-offset: 2px;
  }
`;
export const InventoryViewport = styled.div`
  position: relative;
  height: clamp(340px, 58vh, 740px);
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
  align-self: start;
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
