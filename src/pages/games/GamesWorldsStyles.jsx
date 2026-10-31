import styled from "styled-components";

export const WorldsLayout = styled.div`
  display: flex;
  gap: 1rem;
  height: calc(100vh - 100px);
  min-height: 0;
  padding: 0 1rem 1rem;
  box-sizing: border-box;
`;
export const MappingPane = styled.section`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;
export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.5rem 0;
  font-size: 0.85rem;
`;
export const TableScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid #cccccc;
`;
export const MappingTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.9rem;
  th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #eeeeee;
  }
  th,
  td {
    padding: 0.55rem 0.75rem;
    border-bottom: 1px solid #dddddd;
  }
  th:first-child {
    width: 105px;
  }
  th:nth-child(2) {
    width: 120px;
  }
  td:nth-child(2) {
    font-family: monospace;
    white-space: nowrap;
  }
`;
export const AssociationCard = styled.button`
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 0.6rem 0.75rem;
  border: 1px solid #9baebc;
  border-radius: 2px;
  background: ${({ $selected }) => ($selected ? "#dbeafa" : "#f5f8fa")};
  color: #243c50;
  text-align: left;
  cursor: grab;
  font: inherit;
  &:active {
    cursor: grabbing;
  }
  &:focus-visible {
    outline: 2px solid #446b91;
    outline-offset: 2px;
  }
  strong {
    display: block;
    font-weight: 600;
  }
  small {
    display: block;
    margin-top: 0.3rem;
    line-height: 1.35;
    color: #555555;
  }
`;
export const DropCell = styled.div`
  min-width: 180px;
  min-height: 38px;
  padding: 4px;
  border: 1px dashed #b4c2cc;
  background: ${({ $active }) => ($active ? "#e5f1fc" : "#ffffff")};
`;
export const EmptySlot = styled.button`
  width: 100%;
  min-height: 38px;
  border: none;
  background: transparent;
  color: #6a7780;
  text-align: left;
  font: inherit;
  cursor: pointer;
  &:disabled {
    cursor: default;
  }
`;
export const ContendersPane = styled.aside`
  flex: 0 0 320px;
  min-width: 240px;
  max-width: 40%;
  display: flex;
  flex-direction: column;
  background: #f3f3f3;
  border: 1px solid #cccccc;
  padding: 0.75rem;
  box-sizing: border-box;
  h3 {
    margin: 0 0 0.5rem;
  }
  p {
    margin: 0 0 0.75rem;
    font-size: 0.85rem;
    line-height: 1.4;
  }
  input {
    padding: 0.5rem;
    margin-bottom: 0.75rem;
    min-width: 0;
  }
`;
export const ContenderList = styled.div`
  overflow: auto;
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const NotesInput = styled.textarea`
  display: block;
  width: 100%;
  min-width: 200px;
  min-height: 48px;
  padding: 0.5rem;
  box-sizing: border-box;
  border: 1px solid #b4c2cc;
  border-radius: 2px;
  background: #ffffff;
  color: #243c50;
  font: inherit;
  line-height: 1.35;
  resize: vertical;
  &:focus-visible {
    outline: 2px solid #446b91;
    outline-offset: 1px;
  }
`;
