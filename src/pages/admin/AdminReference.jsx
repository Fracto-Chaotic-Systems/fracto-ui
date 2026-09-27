import { Component } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styled from "styled-components";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import AdminBackend from "../../backend/AdminBackend.jsx";
import AppSettings from "../../AppSettings.jsx";
import {
  KEY_ADMIN_REFERENCE_DOCUMENT,
  KEY_ADMIN_REFERENCE_EXPANDED_FOLDERS,
  KEY_ADMIN_REFERENCE_SELECTION,
} from "../../settings/AdminSettings.jsx";
import {
  KEY_ADMIN_REFERENCE_EMPTY,
  KEY_ADMIN_REFERENCE_ERROR,
  KEY_ADMIN_REFERENCE_LOADING,
  KEY_REFERENCE_TITLE,
} from "../../text/AdminText.jsx";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";
import MarkdownStyles from "../../utils/ui/styles/MarkdownStyles.jsx";
import CoolTree from "../../utils/ui/CoolTree.jsx";
import {
  build_reference_tree,
  restore_reference_selection,
} from "./AdminReferenceTree.js";

const styles_reference = {
  content: {
    display: "flex",
    width: "100%",
    height: "calc(100vh - 75px)",
    minHeight: 0,
    overflow: "hidden",
  },
  list: {
    width: "260px",
    flex: "0 0 260px",
    overflow: "hidden",
    padding: "0.5rem",
    backgroundColor: "#eeeeee",
    borderRight: "1px solid #cccccc",
  },
  document: {
    flex: "1 1 0",
    width: 0,
    minWidth: 0,
    overflow: "auto",
    padding: "1rem 1.5rem 3rem",
    backgroundColor: "#ffffff",
  },
  document_text: {
    width: "100%",
    maxWidth: "100%",
    margin: 0,
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
};

const ReferenceTreeWrapper = styled(CoolStyles.Block)`
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

const parse_expanded_folder_keys = (stored_value) => {
  try {
    const keys = JSON.parse(stored_value);
    return Array.isArray(keys) ? keys : null;
  } catch {
    return null;
  }
};

export class AdminReference extends Component {
  state = {
    repositories: [],
    documents: [],
    tree: [],
    selected_document_id: null,
    selected_tree_key: null,
    selected_document: null,
    loading: true,
    document_loading: false,
    error: null,
  };

  request_id = 0;

  componentDidMount() {
    this.load_tree();
  }

  load_tree = async () => {
    try {
      const result = await AdminBackend.reference_tree();
      const repositories = Array.isArray(result?.repositories)
        ? result.repositories
        : [];
      const { documents, tree } = build_reference_tree(repositories);
      const saved_selection = AppSettings.get(KEY_ADMIN_REFERENCE_SELECTION);
      const saved_document_id = AppSettings.get(KEY_ADMIN_REFERENCE_DOCUMENT);
      const { selected_document, selected_tree_key } = restore_reference_selection(
        tree,
        documents,
        saved_selection,
        saved_document_id,
      );
      this.setState({
        repositories,
        documents,
        tree,
        selected_document_id: selected_document?.id || null,
        selected_tree_key,
        loading: false,
        error: null,
      });
      if (selected_document) {
        this.load_document(selected_document, selected_tree_key);
      }
    } catch (error) {
      this.setState({ loading: false, error });
    }
  };

  load_document = async (document, tree_key = document.tree_key) => {
    const request_id = ++this.request_id;
    this.setState({
      selected_document_id: document.id,
      selected_tree_key: tree_key,
      selected_document: null,
      document_loading: true,
      error: null,
    });
    AppSettings.on_settings_changed({
      [KEY_ADMIN_REFERENCE_DOCUMENT]: document.id,
      [KEY_ADMIN_REFERENCE_SELECTION]: tree_key,
    });
    try {
      const result = await AdminBackend.reference_document(
        document.repository,
        document.path,
      );
      if (request_id !== this.request_id) return;
      this.setState({
        selected_document: result,
        document_loading: false,
        error: null,
      });
    } catch (error) {
      if (request_id !== this.request_id) return;
      this.setState({ document_loading: false, error });
    }
  };

  on_tree_select = (selected_keys, context) => {
    if (!selected_keys.length) return;
    const selected_item = (context.items || [])[0];
    if (!selected_item) return;
    const document_id = selected_item.document_id || selected_item.readme_document_id;
    const document = this.state.documents.find((item) => item.id === document_id);
    if (document) {
      this.load_document(document, selected_item.key);
      return;
    }
    if (selected_item.folder_path !== undefined) {
      this.request_id += 1;
      this.setState({
        selected_document_id: null,
        selected_tree_key: selected_item.key,
        selected_document: null,
        document_loading: false,
        error: null,
      });
      AppSettings.on_settings_changed({
        [KEY_ADMIN_REFERENCE_DOCUMENT]: "",
        [KEY_ADMIN_REFERENCE_SELECTION]: selected_item.key,
      });
    }
  };

  on_tree_expand = (expanded_keys) => {
    AppSettings.on_settings_changed({
      [KEY_ADMIN_REFERENCE_EXPANDED_FOLDERS]: JSON.stringify(expanded_keys),
    });
  };

  render() {
    const {
      tree,
      selected_tree_key,
      selected_document,
      loading,
      document_loading,
      error,
    } = this.state;
    const saved_expanded_keys = parse_expanded_folder_keys(
      AppSettings.get(KEY_ADMIN_REFERENCE_EXPANDED_FOLDERS),
    );
    const default_expanded_keys = saved_expanded_keys || tree.map((node) => node.key);
    return (
      <CoolStyles.Block style={{ height: "100%", overflow: "hidden" }}>
        <styles.SectionTitle>{AppText.get(KEY_REFERENCE_TITLE)}</styles.SectionTitle>
        {loading ? (
          <styles.CenteredBlock>
            {AppText.get(KEY_ADMIN_REFERENCE_LOADING)}
          </styles.CenteredBlock>
        ) : error && !selected_document ? (
          <styles.CenteredBlock>
            {AppText.get(KEY_ADMIN_REFERENCE_ERROR)} {error.message}
          </styles.CenteredBlock>
        ) : (
          <styles.ContentWrapper style={styles_reference.content}>
            <styles.ContentWrapper style={styles_reference.list}>
              {tree.length ? (
                <ReferenceTreeWrapper>
                  <CoolTree
                    tree_data={tree}
                    label_depth_indent_px={16}
                    label_depth_offset_px={1}
                    root_leaf_margin_left_px={0}
                    default_selected_keys={selected_tree_key ? [selected_tree_key] : []}
                    default_expanded_keys={default_expanded_keys}
                    on_select={this.on_tree_select}
                    on_expand={this.on_tree_expand}
                    selectable
                    searchable
                    show_live_description={false}
                    tree_label="reference documents"
                  />
                </ReferenceTreeWrapper>
              ) : (
                <styles.CenteredBlock>
                  {AppText.get(KEY_ADMIN_REFERENCE_EMPTY)}
                </styles.CenteredBlock>
              )}
            </styles.ContentWrapper>
            <styles.ContentWrapper style={styles_reference.document}>
              {document_loading ? (
                <styles.CenteredBlock>
                  {AppText.get(KEY_ADMIN_REFERENCE_LOADING)}
                </styles.CenteredBlock>
              ) : error ? (
                <styles.CenteredBlock>
                  {AppText.get(KEY_ADMIN_REFERENCE_ERROR)} {error.message}
                </styles.CenteredBlock>
              ) : selected_document ? (
                <MarkdownStyles.Document style={styles_reference.document_text}>
                  <ReactMarkdown
                    components={markdown_components}
                    remarkPlugins={[remarkGfm]}
                  >
                    {selected_document.content || ""}
                  </ReactMarkdown>
                </MarkdownStyles.Document>
              ) : selected_tree_key ? (
                <styles.CenteredBlock>readme does not exist</styles.CenteredBlock>
              ) : null}
            </styles.ContentWrapper>
          </styles.ContentWrapper>
        )}
      </CoolStyles.Block>
    );
  }
}

export default AdminReference;
