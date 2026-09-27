import { Component } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styled from "styled-components";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import { KEY_ADMIN_OVERVIEW } from "../../text/AdminText.jsx";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";
import MarkdownStyles from "../../utils/ui/styles/MarkdownStyles.jsx";
import CoolTree from "../../utils/ui/CoolTree.jsx";

// TODO: Populate these after the documentation source and data format are
// defined.
const DOCUMENTATION_TREE = [];
const DOCUMENTATION_MARKDOWN_BY_KEY = {};

const documentation_layout = {
  content: {
    display: "flex",
    width: "100%",
    height: "calc(100vh - 75px)",
    minHeight: 0,
    overflow: "hidden",
  },
  tree: {
    width: "260px",
    flex: "0 0 260px",
    overflow: "hidden",
    padding: "0.5rem",
    backgroundColor: "#eeeeee",
    borderRight: "1px solid #cccccc",
  },
  markdown: {
    flex: "1 1 0",
    width: 0,
    minWidth: 0,
    overflow: "auto",
    padding: "1rem 1.5rem 3rem",
    backgroundColor: "#ffffff",
  },
  markdown_text: {
    width: "100%",
    maxWidth: "100%",
    margin: 0,
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
};

const DocumentationTreeWrapper = styled(CoolStyles.Block)`
  height: 100%;
  min-height: 0;

  .rct-tree-item-button,
  [data-rct-item-interactive="true"] {
    cursor: pointer;
  }
`;

const markdown_components = {
  h1: MarkdownStyles.Heading1,
  h2: MarkdownStyles.Heading2,
  h3: MarkdownStyles.Heading3,
  p: MarkdownStyles.Paragraph,
  ul: MarkdownStyles.UnorderedList,
  ol: MarkdownStyles.OrderedList,
  li: MarkdownStyles.ListItem,
  blockquote: MarkdownStyles.Blockquote,
  a: MarkdownStyles.Link,
  code: MarkdownStyles.InlineCode,
  pre: MarkdownStyles.CodeBlock,
  table: MarkdownStyles.Table,
  thead: MarkdownStyles.TableHead,
  th: MarkdownStyles.TableHeader,
  tr: MarkdownStyles.TableRow,
  td: MarkdownStyles.TableCell,
  hr: MarkdownStyles.HorizontalRule,
};

export class AdminOverview extends Component {
  state = { selected_markdown: "" };

  on_tree_select = (selected_keys) => {
    const selected_key = selected_keys[0];
    this.setState({
      selected_markdown: DOCUMENTATION_MARKDOWN_BY_KEY[selected_key] || "",
    });
  };

  render() {
    const { selected_markdown } = this.state;
    return (
      <CoolStyles.Block style={{ height: "100%", overflow: "hidden" }}>
        <styles.SectionTitle>
          {AppText.get(KEY_ADMIN_OVERVIEW)}
        </styles.SectionTitle>
        <styles.ContentWrapper style={documentation_layout.content}>
          <styles.ContentWrapper style={documentation_layout.tree}>
            {DOCUMENTATION_TREE.length ? (
              <DocumentationTreeWrapper>
                <CoolTree
                  tree_data={DOCUMENTATION_TREE}
                  label_depth_indent_px={16}
                  label_depth_offset_px={1}
                  root_leaf_margin_left_px={0}
                  on_select={this.on_tree_select}
                  selectable
                  searchable
                  show_live_description={false}
                  tree_label={AppText.get(KEY_ADMIN_OVERVIEW)}
                />
              </DocumentationTreeWrapper>
            ) : null}
          </styles.ContentWrapper>
          <styles.ContentWrapper style={documentation_layout.markdown}>
            {selected_markdown ? (
              <MarkdownStyles.Document
                style={documentation_layout.markdown_text}
              >
                <ReactMarkdown
                  components={markdown_components}
                  remarkPlugins={[remarkGfm]}
                >
                  {selected_markdown}
                </ReactMarkdown>
              </MarkdownStyles.Document>
            ) : null}
          </styles.ContentWrapper>
        </styles.ContentWrapper>
      </CoolStyles.Block>
    );
  }
}

export default AdminOverview;
