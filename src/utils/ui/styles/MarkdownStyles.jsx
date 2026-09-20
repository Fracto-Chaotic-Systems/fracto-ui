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

    & > :first-child {
      margin-top: 0;
    }
  `;

  static Heading1 = styled.h1`
    color: #222222;
    font-size: 1.8rem;
    line-height: 1.2;
    margin: 0.5rem 0;
    letter-spacing: 0.5px;
  `;

  static Heading2 = styled.h2`
    color: #333333;
    font-size: 1.35rem;
    line-height: 1.25;
    margin: 1rem 0 0.5rem;
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
