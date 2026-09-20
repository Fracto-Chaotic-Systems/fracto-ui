import React, { Component } from "react";
import PropTypes from "prop-types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import AdminBackend from "../../backend/AdminBackend.jsx";
import {
  KEY_ADMIN_SOCIAL_ERROR,
  KEY_ADMIN_SOCIAL_LOADING,
  KEY_ADMIN_SOCIAL_PAGE_TITLE,
} from "../../text/AdminText.jsx";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";

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
    overflowY: "auto",
    padding: "0.5rem",
    backgroundColor: "#eeeeee",
    borderRight: "1px solid #cccccc",
  },
  list_item: {
    display: "block",
    width: "100%",
    padding: "0.6rem 0.5rem",
    border: 0,
    textAlign: "left",
    fontSize: "0.9rem",
    letterSpacing: "0.5px",
    cursor: "pointer",
    backgroundColor: "transparent",
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
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    fontFamily: "sans-serif",
    fontSize: "0.95rem",
    lineHeight: 1.5,
    color: "#333333",
  },
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
      this.setState({
        documents,
        selected_document_id: documents[0]?.id || null,
        loading: false,
        error: null,
      });
    } catch (error) {
      this.setState({ loading: false, error });
    }
  };

  select_document = (selected_document_id) => {
    this.setState({ selected_document_id });
  };

  render() {
    const { documents, selected_document_id, loading, error } = this.state;
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
              {documents.map((document) => {
                const selected = document.id === selected_document?.id;
                return (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => this.select_document(document.id)}
                    style={{
                      ...styles_social.list_item,
                      fontWeight: selected ? "bold" : "normal",
                      color: selected ? "#000000" : "#555555",
                      backgroundColor: selected ? "#ffffff" : "transparent",
                    }}
                  >
                    {document.title}
                  </button>
                );
              })}
            </styles.ContentWrapper>
            <styles.ContentWrapper style={styles_social.document}>
              <div style={styles_social.document_text}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selected_document?.content || ""}
                </ReactMarkdown>
              </div>
            </styles.ContentWrapper>
          </styles.ContentWrapper>
        )}
      </CoolStyles.Block>
    );
  }
}

export default AdminSocial;
