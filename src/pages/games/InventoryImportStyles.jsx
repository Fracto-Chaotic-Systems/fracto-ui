import styled from "styled-components";
export const ImportOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: #162a3566;
  display: grid;
  place-items: center;
  padding: 1rem;
`;
export const ImportDialog = styled.div`
  box-sizing: border-box;
  width: min(560px, 100%);
  max-height: 90vh;
  overflow: auto;
  padding: 1.5rem;
  background: #f9fbfb;
  border: 1px solid #b6c5ca;
  border-radius: 6px;
  color: #344d55;
  h2 {
    margin-top: 0;
    font-size: 1.2rem;
  }
  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }
  label {
    display: grid;
    gap: 0.5rem;
    margin: 1rem 0;
  }
  input,
  select {
    box-sizing: border-box;
    width: 100%;
    font: inherit;
    padding: 0.5rem;
  }
  p {
    line-height: 1.5;
  }
`;
export const ImportActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.25rem;
  button {
    padding: 0.5rem 0.9rem;
    cursor: pointer;
  }
`;
