import styled from "styled-components";
export const ConstructionToolsStyles = styled.section`
  border-top: 1px solid #ccd4d6;
  padding-top: 0.75rem;
  h3 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
  }
  form,
  fieldset {
    display: grid;
    gap: 0.65rem;
    min-width: 0;
    padding: 0;
    border: 0;
    margin: 0.75rem 0;
  }
  label {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
  input,
  select,
  textarea {
    width: 100%;
    box-sizing: border-box;
    font: inherit;
  }
  input[type="checkbox"] {
    width: auto;
    align-self: start;
  }
  details {
    margin-top: 0.75rem;
  }
  summary {
    cursor: pointer;
    font-weight: 600;
  }
  p {
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
`;
