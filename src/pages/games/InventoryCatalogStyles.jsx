import styled from "styled-components";

export const CatalogTab = styled.div`
  padding: 0.75rem;
  &[hidden] {
    display: none;
  }
`;
/** `$bare` drops the outlined box, e.g. for the tabbed catalog information. */
/** An attribution value with a pencil revealed on hover or keyboard focus. */
export const CatalogValue = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  max-width: 100%;
  .catalog-value {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: text;
    overflow-wrap: anywhere;
  }
  .catalog-value:disabled {
    cursor: default;
  }
  .catalog-edit-action {
    visibility: hidden;
  }
  &:hover .catalog-edit-action,
  &:focus-within .catalog-edit-action {
    visibility: visible;
  }
`;
/** Inline attribution editor: input (or textarea), green check, red X. */
export const CatalogFieldForm = styled.form`
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  input,
  textarea {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    font: inherit;
  }
`;
export const CatalogPanel = styled.section`
  margin-top: ${({ $bare }) => ($bare ? "0.75rem" : "1.25rem")};
  padding: ${({ $bare }) => ($bare ? "0" : "1.1rem")};
  border: ${({ $bare }) => ($bare ? "0" : "1px solid #ccd4d6")};
  border-radius: 6px;
  background: ${({ $bare }) => ($bare ? "transparent" : "#f9fbfb")};
  font-size: 0.875rem;
  overflow-wrap: anywhere;
  h2 {
    font-size: 1.1rem;
    margin: 0 0 0.6rem;
  }
  h3 {
    font-size: 0.95rem;
    margin: 1.25rem 0 0.5rem;
  }
  a {
    color: #306b7c;
  }
  dl {
    display: grid;
    grid-template-columns: minmax(100px, 0.4fr) minmax(0, 1fr);
    gap: 0.65rem 1rem;
  }
  dt {
    color: #52636a;
  }
  dd {
    margin: 0;
    white-space: pre-wrap;
  }
  ol {
    padding-left: 1.3rem;
  }
  li {
    margin-bottom: 0.75rem;
    line-height: 1.5;
  }
  li p {
    margin: 0.25rem 0;
  }
  button {
    padding: 0.45rem 0.7rem;
    cursor: pointer;
  }
`;
export const CatalogActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.75rem 0;
`;
export const CatalogForm = styled.form`
  display: grid;
  gap: 0.85rem;
  margin-top: 1rem;
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.85rem;
    min-width: 0;
  }
  label {
    display: grid;
    gap: 0.35rem;
  }
  input,
  textarea {
    box-sizing: border-box;
    width: 100%;
    border: 1px solid #b6c5ca;
    border-radius: 3px;
    padding: 0.5rem;
    font: inherit;
    color: #344d55;
    background: white;
  }
  textarea {
    min-height: 75px;
    resize: vertical;
  }
`;
export const CatalogMessage = styled.p`
  padding: 0.6rem;
  background: #eaf1f3;
  border-radius: 4px;
`;

export const CatalogMoveForm = styled.form`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0.75rem 0;
  label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex: 0 1 auto;
    min-width: 0;
  }
  select {
    flex: 0 1 auto;
    width: auto;
    max-width: 100%;
    min-width: 0;
    font: inherit;
  }
`;
