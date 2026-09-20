import styled from "styled-components";

import CoolStyles from "./CoolStyles.jsx";

/**
 * Shared presentation primitives for Markdown rendered as React elements.
 * Document files provide structure; these components provide consistent
 * spacing, typography, links, tables, quotations, and code presentation.
 */
export class MarkdownStyles {
  static Document = styled(CoolStyles.Block)`
    color: #333333;
    font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
    font-size: 0.95rem;
    line-height: 1.5;
    /* Source line wrapping should follow the pane width, not file formatting. */
    white-space: normal;
    overflow-wrap: anywhere;

    .media-entry {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      width: 100%;
      margin: 0.5rem 0 1rem;
    }

    .media-entry-visual,
    .media-entry-properties {
      box-sizing: border-box;
      width: calc(50% - 0.5rem);
      min-width: 0;
    }

    .media-entry-visual {
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }

    .media-entry-visual img {
      display: block;
      width: auto;
      max-width: 100%;
      max-height: 32rem;
      height: auto;
      object-fit: contain;
    }

    .media-entry-properties details {
      margin: 0 0 0.5rem;
    }

    .media-entry-properties > p {
      margin: 0;
      line-height: 1.25;
    }

    .media-entry-properties summary {
      cursor: pointer;
      color: #555555;
      font-style: italic;
    }

    .media-ledger-index {
      max-height: 12rem;
      margin: 0 0 1rem;
      padding: 0.5rem 0.75rem;
      overflow-y: auto;
      border: 1px solid #dddddd;
      border-radius: 4px;
      background: #f7f7f7;
    }

    .media-ledger-index strong {
      display: block;
      margin-bottom: 0.25rem;
    }

    .media-ledger-index ul {
      margin: 0;
      padding-left: 1.25rem;
    }

    .media-ledger-index li {
      margin: 0;
    }

    .media-copy-alt {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      margin-left: 0.25rem;
      padding: 0;
      border: 0;
      border-radius: 3px;
      background: transparent;
      color: #1769aa;
      cursor: pointer;
      vertical-align: middle;
    }

    .media-copy-alt:hover {
      background: #eeeeee;
    }

    .media-copy-alt svg {
      width: 1rem;
      height: 1rem;
      fill: currentColor;
    }

    @media (max-width: 700px) {
      .media-entry {
        display: block;
      }

      .media-entry-visual,
      .media-entry-properties {
        width: 100%;
      }

      .media-entry-properties {
        margin-top: 0.75rem;
      }
    }

    & > :first-child {
      margin-top: 0;
    }

    .subtitle {
      font-size: 1.25rem;
      font-style: italic;
      margin: 0 0 1.25rem;
    }
  `;

  static Heading1 = styled.h1`
    color: #222222;
    font-size: 2rem;
    line-height: 1.2;
    margin: 0.5rem 0;
    letter-spacing: 0.5px;
  `;

  static Heading2 = styled.h2`
    color: #333333;
    font-size: 1.35rem;
    line-height: 1.25;
    margin: 1.5rem 0 0.75rem;
    letter-spacing: 0.25px;
  `;

  static Heading3 = styled.h3`
    color: #444444;
    font-size: 1.1rem;
    line-height: 1.3;
    margin: 0.75rem 0 0.25rem;
  `;

  static Paragraph = styled.p`
    margin: 0 0 0.25rem;
    line-height: 1.25;
  `;

  static UnorderedList = styled.ul`
    margin: 0 0 1rem;
    padding-left: 1.5rem;
  `;

  static OrderedList = styled.ol`
    margin: 0 0 1rem;
    padding-left: 1.5rem;
  `;

  static ListItem = styled.li`
  `;

  static Blockquote = styled.blockquote`
    margin: 0.5rem;
    padding: 0.5rem 1rem;
    border-left: 4px solid #bbbbbb;
    color: #555555;
    font-style: italic;
    font-size: 1.25rem;
    background-color: #f5f5f5;
  `;

  static Link = styled.a`
    color: #1769aa;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  `;

  static InlineCode = styled.code`
    padding: 0.1rem 0.25rem;
    border-radius: 3px;
    background-color: #eeeeee;
    color: #333333;
    font-family: monospace;
  `;

  static CodeBlock = styled.pre`
    overflow-x: auto;
    margin: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 4px;
    background-color: #eeeeee;
    color: #333333;
    font-family: monospace;
    font-size: 0.85rem;
    line-height: 1.2;

    & > code {
      display: block;
      padding: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      line-height: inherit;
    }
  `;

  static Table = styled.table`
    width: 100%;
    margin: 1rem 0;
    border-collapse: collapse;
    font-size: 0.9rem;
  `;

  static TableHead = styled.thead`
    background-color: #dddddd;
  `;

  static TableHeader = styled.th`
    padding: 0.4rem 0.5rem;
    border: 1px solid #bbbbbb;
    text-align: left;
    font-weight: bold;
  `;

  static TableRow = styled.tr`
    &:nth-child(even) {
      background-color: #f7f7f7;
    }
  `;

  static TableCell = styled.td`
    padding: 0.4rem 0.5rem;
    border: 1px solid #cccccc;
    vertical-align: top;
  `;

  static HorizontalRule = styled.hr`
    margin: 1.5rem 0;
    border: 0;
    border-top: 1px solid #cccccc;
  `;
}

export default MarkdownStyles;
