import styled from "styled-components";
export const MaterialSearchStyles = styled.section`
  min-width: 0;
  border-top: 1px solid #ccd4d6;
  padding-top: 0.75rem;
  overflow-wrap: anywhere;
  h3 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
  }
  form {
    display: grid;
    gap: 0.65rem;
  }
  label {
    display: grid;
    gap: 0.3rem;
  }
  input,
  select,
  textarea {
    width: 100%;
    box-sizing: border-box;
  }
  details {
    margin: 0.65rem 0;
    border-bottom: 1px solid #ccd4d6;
    padding-bottom: 0.5rem;
  }
  summary {
    cursor: pointer;
  }
  dl {
    display: block;
  }
  dl > div {
    margin-bottom: 0.5rem;
  }
  dd {
    margin: 0.15rem 0;
    font-family: monospace;
  }
  p {
    line-height: 1.5;
  }
  code {
    word-break: break-all;
  }
`;
