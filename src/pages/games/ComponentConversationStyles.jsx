import styled from "styled-components";
import { ConstructionToolsStyles } from "./ComponentConstructionStyles.jsx";
export const ConversationStyles = styled(ConstructionToolsStyles)`
  border-top: 0;
  padding-top: 0;
  border-bottom: 1px solid #ccd4d6;
  padding-bottom: 1rem;
  h4 {
    margin-bottom: 0.5rem;
  }
  [role="log"] {
    max-height: 220px;
    overflow: auto;
    border-left: 3px solid #bdc9cc;
    padding-left: 0.7rem;
  }
  [role="log"]:empty {
    display: none;
  }
  textarea {
    resize: vertical;
    min-height: 5rem;
  }
  li {
    margin: 0.4rem 0;
    overflow-wrap: anywhere;
  }
  ul {
    padding-left: 1.25rem;
  }
  [data-memory-instructions] {
    white-space: pre-wrap;
  }
`;
