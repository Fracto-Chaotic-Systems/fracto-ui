import React, { Component } from "react";
import PropTypes from "prop-types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styled from "styled-components";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import AdminBackend from "../../backend/AdminBackend.jsx";
import AppSettings from "../../AppSettings.jsx";
import { KEY_ADMIN_SOCIAL_DOCUMENT } from "../../settings/AdminSettings.jsx";
import {
  KEY_ADMIN_SOCIAL_ERROR,
  KEY_ADMIN_SOCIAL_LOADING,
  KEY_ADMIN_SOCIAL_PAGE_TITLE,
} from "../../text/AdminText.jsx";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";
import MarkdownStyles from "../../utils/ui/styles/MarkdownStyles.jsx";
import CoolTree from "../../utils/ui/CoolTree.jsx";

const build_document_tree = (documents) => {
  const root_nodes = [];
  const folder_nodes = new Map();
  documents.forEach((document) => {
    const document_path = document.path || document.filename || document.id;
    const segments = document_path.split("/").filter(Boolean);
    let parent_nodes = root_nodes;
    let parent_key = "social";
    segments.forEach((segment, segment_index) => {
      const is_document = segment_index === segments.length - 1;
      const node_key = `${parent_key}/${segment}`;
      if (is_document) {
        parent_nodes.push({
          key: document.id,
          title: document.title,
          isLeaf: true,
          document_id: document.id,
        });
        return;
      }
      let folder = folder_nodes.get(node_key);
      if (!folder) {
        folder = {
          key: node_key,
          title: segment,
          isLeaf: false,
          children: [],
        };
        folder_nodes.set(node_key, folder);
        parent_nodes.push(folder);
      }
      parent_nodes = folder.children;
      parent_key = node_key;
    });
  });
  return root_nodes;
};

const styles_social = {
  content: {
    display: "flex",
    height: "calc(100vh - 75px)",
    minHeight: 0,
    overflow: "hidden",
  },
  list: {
    width: "240px",
    flex: "0 0 240px",
    overflow: "hidden",
    padding: "0.5rem",
    backgroundColor: "#eeeeee",
    borderRight: "1px solid #cccccc",
  },
  document: {
    flex: "1 1 auto",
    minWidth: 0,
    overflow: "auto",
    padding: "1rem 1.5rem 3rem",
    backgroundColor: "#ffffff",
  },
  document_text: {
    margin: 0,
    overflowWrap: "anywhere",
  },
};

const SocialTreeWrapper = styled(CoolStyles.Block)`
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

/**
 * Administrative entry point for Fracto's public communication workspace.
 *
 * Campaign documents are loaded from the Admin server's root-level social
 * knowledge base so the page and editorial reference remain one source of truth.
 */
export class AdminSocial extends Component {
  static propTypes = {
    width_px: PropTypes.number,
    height_px: PropTypes.number,
  };

  state = {
    documents: [],
    selected_document_id: null,
    loading: true,
    error: null,
  };

  componentDidMount() {
    this.load_documents();
  }

  load_documents = async () => {
    try {
      const result = await AdminBackend.social();
      const documents = Array.isArray(result?.documents)
        ? result.documents
        : [];
      const saved_document_id = AppSettings.get(KEY_ADMIN_SOCIAL_DOCUMENT);
      const selected_document_id = documents.some(
        (document) => document.id === saved_document_id,
      )
        ? saved_document_id
        : documents[0]?.id || null;
      this.setState({
        documents,
        selected_document_id,
        loading: false,
        error: null,
      });
    } catch (error) {
      this.setState({ loading: false, error });
    }
  };

  select_document = (selected_document_id) => {
    this.setState({ selected_document_id });
    AppSettings.on_settings_changed({
      [KEY_ADMIN_SOCIAL_DOCUMENT]: selected_document_id,
    });
  };

  resolve_document_link = (href) => {
    const { documents, selected_document_id } = this.state;
    if (!href || /^(?:[a-z]+:|\/\/|#)/i.test(href)) return null;
    const selected_document = documents.find(
      (document) => document.id === selected_document_id,
    );
    const current_segments = (selected_document?.path || "")
      .split("/")
      .filter(Boolean);
    current_segments.pop();
    const target_segments = href.split("#")[0].split("/");
    const resolved_segments = [...current_segments];
    target_segments.forEach((segment) => {
      if (!segment || segment === ".") return;
      if (segment === "..") {
        resolved_segments.pop();
      } else {
        resolved_segments.push(segment);
      }
    });
    const resolved_path = resolved_segments.join("/").toLowerCase();
    return (
      documents.find(
        (document) => document.path.toLowerCase() === resolved_path,
      )?.id || null
    );
  };

  render_document_link = ({ href, children, ...link_props }) => {
    const document_id = this.resolve_document_link(href);
    const is_external_link = /^(?:https?:)?\/\//i.test(href || "");
    return (
      <MarkdownStyles.Link
        {...link_props}
        href={href}
        target={is_external_link ? "_blank" : link_props.target}
        rel={is_external_link ? "noopener noreferrer" : link_props.rel}
        onClick={
          document_id
            ? (event) => {
                event.preventDefault();
                this.select_document(document_id);
              }
            : link_props.onClick
        }
      >
        {children}
      </MarkdownStyles.Link>
    );
  };

  on_tree_select = (selected_keys, context) => {
    if (!selected_keys.length) {
      return;
    }
    const selected_document = (context.items || [])
      .map((item) => item.document_id)
      .find(Boolean);
    if (selected_document) {
      this.select_document(selected_document);
    }
  };

  render() {
    const { documents, selected_document_id, loading, error } = this.state;
    const document_tree = build_document_tree(documents);
    const selected_document =
      documents.find((document) => document.id === selected_document_id) ||
      documents[0];
    return (
      <CoolStyles.Block style={{ height: "100%", overflow: "hidden" }}>
        <styles.SectionTitle>
          {AppText.get(KEY_ADMIN_SOCIAL_PAGE_TITLE)}
        </styles.SectionTitle>
        {loading && (
          <styles.CenteredBlock>
            {AppText.get(KEY_ADMIN_SOCIAL_LOADING)}
          </styles.CenteredBlock>
        )}
        {error && (
          <styles.CenteredBlock>
            {AppText.get(KEY_ADMIN_SOCIAL_ERROR)} {error.message}
          </styles.CenteredBlock>
        )}
        {!loading && !error && (
            <styles.ContentWrapper style={styles_social.content}>
            <styles.ContentWrapper style={styles_social.list}>
              <SocialTreeWrapper>
                <CoolTree
                  tree_data={document_tree}
                  default_selected_keys={
                    selected_document?.id ? [selected_document.id] : []
                  }
                  default_expanded_keys={["social/Bluesky"]}
                  on_select={this.on_tree_select}
                  selectable
                  searchable={false}
                  show_live_description={false}
                  tree_label="social documents"
                />
              </SocialTreeWrapper>
            </styles.ContentWrapper>
            <styles.ContentWrapper style={styles_social.document}>
              <MarkdownStyles.Document style={styles_social.document_text}>
                <ReactMarkdown
                  components={{
                    ...markdown_components,
                    a: this.render_document_link,
                  }}
                  remarkPlugins={[remarkGfm]}
                >
                  {selected_document?.content || ""}
                </ReactMarkdown>
              </MarkdownStyles.Document>
            </styles.ContentWrapper>
          </styles.ContentWrapper>
        )}
      </CoolStyles.Block>
    );
  }
}

export default AdminSocial;
