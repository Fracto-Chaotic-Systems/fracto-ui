import styled from "styled-components";
export const ReferenceLayout = styled.div`
  display: flex;
  height: calc(100vh - 100px);
  min-height: 0;
  overflow: hidden;
  > :nth-child(2) {
    flex-shrink: 0;
    box-sizing: border-box;
  }
`;
export const TreePane = styled.div`
  flex: 0 0 auto;
  min-width: 0;
  box-sizing: border-box;
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

export const SynsetButton = styled.button`
  border: 0;
  padding: 0;
  background: transparent;
  color: #245c78;
  font: inherit;
  text-align: left;
  text-decoration: underline;
  cursor: pointer;
  &:focus-visible {
    outline: 2px solid #446b91;
    outline-offset: 2px;
  }
`;
export const Breadcrumbs = styled.nav`
  margin: 1rem 0;
  h4 {
    margin-bottom: 0.5rem;
  }
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    margin-left: calc(var(--predecessor-depth) * 0.75rem);
    padding: 0.25rem 0;
  }
`;
export const DescendantTree = styled.section`
  margin: 1rem 0;
  h4 {
    margin-bottom: 0.5rem;
  }
  ul {
    list-style: none;
    padding-left: 1rem;
    border-left: 1px solid #b4c2cc;
  }
  li {
    padding: 0.25rem 0;
  }
`;

export const WorldPatternLink = styled.a`
  display: inline-block;
  text-decoration: none;
  &:focus-visible {
    outline: 2px solid #446b91;
    outline-offset: 3px;
  }
`;

export const EntryTitle = styled.h3`
  font-size: 1.75rem;
  margin: 0 0 0.35rem;
`;

export const EntryDefinition = styled.p`
  margin-top: 0;
  font-size: 1.25rem;
  font-style: italic;
`;

export const MetadataLine = styled.p`
  margin: 0;
`;
