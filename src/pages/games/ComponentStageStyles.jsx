import styled from "styled-components";
import { InventoryCaption, InventoryViewport } from "./InventoryStyles.jsx";

export const StageHost = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  p {
    line-height: 1.5;
  }
`;

export const StageWorkspace = styled.div`
  flex: 1;
  min-height: 0;
  display: ${({ $hidden }) => ($hidden ? "none" : "grid")};
  grid-template-columns: minmax(0, 1fr) 330px;
  grid-template-rows: minmax(360px, 1fr);
  gap: 1rem;
  overflow: auto;
  /* Text and range inputs fill their row; checkboxes keep their own size so
     their labels (e.g. Play animation) stay beside them. */
  input:not([type="checkbox"]):not([type="radio"]) {
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
/** Lighting sliders in the stage's right panel (styled like the materials controls). */
export const StageLightingGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  &[hidden] {
    display: none;
  }
`;
/** The variants list inside the stage's right panel. */
export const StageVariants = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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

/** The middle column: the stage above, model details (tabs) below. */
export const StagePane = styled.div`
  position: relative;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;
/** A caption line between the stage and the tabs; the pane's gap spaces it. */
export const StageCaption = styled(InventoryCaption)`
  margin: 0;
`;
/** The "materials" tab's usage table. */
export const MaterialUsageTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  th,
  td {
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid #dde3e5;
    text-align: right;
    vertical-align: top;
    font-variant-numeric: tabular-nums;
  }
  th:first-child {
    text-align: left;
  }
  thead th {
    color: #52636a;
    font-weight: 600;
    white-space: nowrap;
  }
  tbody th {
    font-weight: 600;
  }
  small {
    display: block;
    color: #52636a;
    font-weight: normal;
  }
  tfoot th,
  tfoot td {
    border-bottom: 0;
    color: #52636a;
  }
  tfoot td {
    text-align: left;
  }
  .material-group button {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
  }
  .material-member th {
    padding-left: 1.5rem;
    font-weight: normal;
  }
`;
/** The "history" tab's list, spaced like a material's history. */
export const StageHistoryList = styled.ol`
  margin: 0;
  padding-left: 1.3rem;
  font-size: 0.875rem;
  li {
    margin-bottom: 0.75rem;
    line-height: 1.5;
  }
  li p {
    margin: 0.25rem 0;
  }
`;
/** Padding inside a details tab card. */
export const StageTab = styled.div`
  padding: 0.75rem;
`;
/** The read-only construction document inside the "construction" tab. */
export const ConstructionDocumentStyles = styled.section`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  &[hidden] {
    display: none;
  }
  p {
    margin: 0.25rem 0;
  }
`;
/** The document text; it sits directly in the tab card (no extra outline). */
export const ConstructionDocumentBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
`;
