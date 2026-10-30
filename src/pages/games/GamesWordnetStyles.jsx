import styled from "styled-components";
export const ReferenceLayout = styled.div`
  display: flex;
  height: calc(100vh - 100px);
  min-height: 0;
  overflow: hidden;
`;
export const TreePane = styled.div`
  flex: 0 1 45%;
  min-width: 180px;
  height: 100%;
  overflow: hidden;
  border-right: 1px solid #cccccc;
`;
export const DetailsPane = styled.div`
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 1rem;
  overflow-wrap: anywhere;
`;
