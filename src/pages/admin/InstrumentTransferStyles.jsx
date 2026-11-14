import styled from "styled-components";

export const TransferPanel = styled.section`
  border-top: 1px solid #ccc;
  margin: 1.5rem 0;
  padding-top: 0.75rem;
  min-width: 0;
  font-size: 0.875rem;
  h2 {
    font-size: 1.125rem;
  }
  p {
    line-height: 1.5;
  }
  code {
    overflow-wrap: anywhere;
  }
  dl {
    display: grid;
    grid-template-columns: minmax(9rem, 1fr) minmax(0, 2fr);
    gap: 0.6rem 1rem;
  }
  dt {
    font-weight: 600;
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  @media (max-width: 560px) {
    dl {
      grid-template-columns: 1fr;
      gap: 0.25rem;
    }
    dd {
      margin-bottom: 0.75rem;
    }
  }
`;
export const TransferActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin: 1rem 0;
  button {
    font: inherit;
    padding: 0.5rem 0.8rem;
    border: 1px solid #bbb;
    border-radius: 0.25rem;
    background: #f5f5f5;
    color: #333;
    cursor: pointer;
  }
  button[data-primary="true"] {
    background: #315c83;
    border-color: #315c83;
    color: white;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  button:focus-visible {
    outline: 2px solid #315c83;
    outline-offset: 3px;
  }
`;
export const TransferTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  caption {
    text-align: left;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  th,
  td {
    padding: 0.45rem 0.6rem;
    border-bottom: 1px solid #ddd;
  }
  th {
    text-align: left;
    font-weight: 500;
  }
  td {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
`;
export const TransferStatus = styled.div`
  padding: 0.75rem;
  background: #edf2f6;
  border-radius: 0.25rem;
  margin: 1rem 0;
  progress {
    display: block;
    width: min(100%, 28rem);
    margin: 0.5rem 0;
  }
`;
export const TransferError = styled.p`
  color: #a12525;
`;
