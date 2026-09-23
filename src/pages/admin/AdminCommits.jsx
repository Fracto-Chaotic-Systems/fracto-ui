import React, { Component } from "react";
import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import { copy } from "../../utils/ui/CoolIcons.jsx";
import AppText from "../../AppText.jsx";
import { KEY_ADMIN_COMMITS_TITLE } from "../../text/AdminText.jsx";
import AdminBackend from "../../backend/AdminBackend.jsx";
import AppSettings from "../../AppSettings.jsx";
import { KEY_ADMIN_COMMITS_REPOSITORY_VISIBILITY } from "../../settings/AdminSettings.jsx";
import CoolTable from "../../utils/ui/CoolTable.jsx";
import { CoolStyles } from "../../utils/ui/CoolImports.jsx";
import { CELL_LABEL_STYLE } from "../../utils/ui/styles/CoolStyles.jsx";
import { SETTING_LABEL_STYLE } from "../../utils/ui/styles/SettingStyles.jsx";
import { merge_commit_timeline } from "./AdminCommitTimeline.js";
import ReactTimeAgo from "react-time-ago";
import {
  CoolTableStyles as table_styles,
  CELL_ALIGN_CENTER,
  CELL_ALIGN_LEFT,
  CELL_ALIGN_RIGHT,
  CELL_TYPE_CALLBACK,
  CELL_TYPE_NUMBER,
  CELL_TYPE_TEXT,
} from "../../utils/ui/styles/CoolTableStyles.jsx";
import {
  KEY_ADMIN_COMMITS_ERROR,
  KEY_ADMIN_COMMITS_LOADING,
  KEY_ADMIN_COMMIT_CREATED,
  KEY_ADMIN_COMMIT_DATE,
  KEY_ADMIN_COMMIT_FILES,
  KEY_ADMIN_COMMIT_HASH,
  KEY_ADMIN_COMMIT_CHANGES,
  KEY_ADMIN_COMMIT_INSERTED,
  KEY_ADMIN_COMMIT_DELETED,
  KEY_ADMIN_COMMIT_MESSAGE,
  KEY_ADMIN_COMMIT_REMOVED,
  KEY_ADMIN_COMMIT_REPOSITORY,
  KEY_ADMIN_REPOSITORY_ADMIN,
  KEY_ADMIN_REPOSITORY_ALL,
  KEY_ADMIN_COPY_HASH,
  KEY_ADMIN_VIEW_GITHUB,
  KEY_ADMIN_REPOSITORY_ASSETS,
  KEY_ADMIN_REPOSITORY_DATA,
  KEY_ADMIN_REPOSITORY_MAIN,
  KEY_ADMIN_REPOSITORY_NONE,
  KEY_ADMIN_REPOSITORY_TILES,
  KEY_ADMIN_REPOSITORY_UI,
} from "../../text/AdminText.jsx";

const TABLE_HEADER_SPACE_PX = 40;
const MONOSPACE_CHARACTER_WIDTH_PX = 8;
const MESSAGE_CHARACTER_WIDTH_PX = 9.5;
const COLUMN_HORIZONTAL_PADDING_PX = 16;
const COMPACT_COLUMN_WIDTH_PX = 100;
const HASH_COLUMN_SAFETY_PX = 12;
const COMMIT_FIELDS = [
  [
    "repository",
    KEY_ADMIN_COMMIT_REPOSITORY,
    CELL_TYPE_CALLBACK,
    CELL_ALIGN_CENTER,
  ],
  ["hash", KEY_ADMIN_COMMIT_HASH, CELL_TYPE_CALLBACK, CELL_ALIGN_CENTER],
  ["date", KEY_ADMIN_COMMIT_DATE, CELL_TYPE_CALLBACK, CELL_ALIGN_CENTER],
  ["message", KEY_ADMIN_COMMIT_MESSAGE, CELL_TYPE_TEXT, CELL_ALIGN_LEFT],
  [
    "change_summary",
    KEY_ADMIN_COMMIT_CHANGES,
    CELL_TYPE_CALLBACK,
    CELL_ALIGN_LEFT,
  ],
];
const REPOSITORY_LABEL_KEYS = {
  fracto: KEY_ADMIN_REPOSITORY_MAIN,
  "fracto-admin-server": KEY_ADMIN_REPOSITORY_ADMIN,
  "fracto-data-server": KEY_ADMIN_REPOSITORY_DATA,
  "fracto-tiles-server": KEY_ADMIN_REPOSITORY_TILES,
  "fracto-asset-server": KEY_ADMIN_REPOSITORY_ASSETS,
  "fracto-ui": KEY_ADMIN_REPOSITORY_UI,
};
const REPOSITORY_NAMES = Object.keys(REPOSITORY_LABEL_KEYS);
const GITHUB_ORIGIN = "https://github.com/Fracto-Chaotic-Systems";

const text_value = (value) =>
  value === null || value === undefined ? "" : String(value);
const text_label = (key) => AppText.get(key) || key;
const repository_label = (repository) =>
  text_label(REPOSITORY_LABEL_KEYS[repository]) || repository;
// Git's conventional abbreviated object name is seven hexadecimal characters.
const hash_label = (hash) => text_value(hash).slice(0, 7);
const render_repository_link = (repository) => {
  const repository_path = repository === "fracto" ? "fracto" : repository;
  return (
    <a
      href={`${GITHUB_ORIGIN}/${repository_path}`}
      target="_blank"
      rel="noreferrer"
      title={AppText.get(KEY_ADMIN_VIEW_GITHUB)}
      onMouseEnter={(event) => {
        event.currentTarget.style.color = "blue";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.color = "black";
      }}
      style={{
        fontWeight: "bold",
        letterSpacing: "1px",
        color: "black",
        cursor: "pointer",
        textTransform: "uppercase",
      }}
    >
      {repository_label(repository)}
    </a>
  );
};
const change_summary_text = (commit) =>
  `${commit.files_changed} ${text_label(KEY_ADMIN_COMMIT_FILES)}: ` +
  `${commit.insertions} ${text_label(KEY_ADMIN_COMMIT_INSERTED)}, ` +
  `${commit.deletions} ${text_label(KEY_ADMIN_COMMIT_DELETED)}, ` +
  `${commit.files_created} ${text_label(KEY_ADMIN_COMMIT_CREATED)}, ` +
  `${commit.files_removed} ${text_label(KEY_ADMIN_COMMIT_REMOVED)}`;
const render_change_summary = (commit) => {
  const number_style = {
    fontFamily: "monospace",
    fontWeight: "bold",
    color: "black",
  };
  const text_style = {
    fontFamily: "sans-serif",
    fontStyle: "italic",
    color: "#666666",
  };
  return (
    <>
      <span style={number_style}>{commit.files_changed}</span>{" "}
      <span style={text_style}>{text_label(KEY_ADMIN_COMMIT_FILES)}:</span>{" "}
      <span style={number_style}>{commit.insertions}</span>{" "}
      <span style={text_style}>{text_label(KEY_ADMIN_COMMIT_INSERTED)},</span>{" "}
      <span style={number_style}>{commit.deletions}</span>{" "}
      <span style={text_style}>{text_label(KEY_ADMIN_COMMIT_DELETED)},</span>{" "}
      <span style={number_style}>{commit.files_created}</span>{" "}
      <span style={text_style}>{text_label(KEY_ADMIN_COMMIT_CREATED)},</span>{" "}
      <span style={number_style}>{commit.files_removed}</span>{" "}
      <span style={text_style}>{text_label(KEY_ADMIN_COMMIT_REMOVED)}</span>
    </>
  );
};
const render_commit_hash = ({ hash, repository }) => {
  const repository_path = repository === "fracto" ? "fracto" : repository;
  return (
    <>
      <a
        href={`${GITHUB_ORIGIN}/${repository_path}/commit/${hash}`}
        target="_blank"
        rel="noreferrer"
        title={AppText.get(KEY_ADMIN_VIEW_GITHUB)}
        onMouseEnter={(event) => {
          event.currentTarget.style.color = "blue";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.color = "black";
        }}
        style={{
          fontFamily: "monospace",
          fontWeight: "bold",
          letterSpacing: "1px",
          color: "black",
          cursor: "pointer",
        }}
      >
        {hash_label(hash)}
      </a>
      <styles.InlineHover
        title={AppText.get(KEY_ADMIN_COPY_HASH)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          navigator.clipboard?.writeText(hash);
        }}
        style={{ marginLeft: "0.175rem", cursor: "pointer", color: "blue" }}
      >
        {React.cloneElement(copy, {
          width: "1rem",
          height: "1rem",
          fill: "currentColor",
        })}
      </styles.InlineHover>
    </>
  );
};
const render_commit_date = (date) => {
  const timestamp = new Date(date);
  return (
    <span title={timestamp.toLocaleString()}>
      <ReactTimeAgo date={timestamp} />
    </span>
  );
};
const commit_columns = (commits, available_width) => {
  const width_commits = commits;
  const intrinsic = COMMIT_FIELDS.map(([id, label_key]) => {
    const widest = Math.max(
      text_label(label_key).length,
      ...width_commits.map((commit) => {
        if (id === "repository")
          return repository_label(commit[id]?.[1] || commit[id]).length;
        if (id === "hash")
          return hash_label(commit[id]?.hash || commit[id]).length;
        if (id === "date") return "moments ago".length;
        if (id === "change_summary")
          return change_summary_text(commit[id]?.[1] || commit).length;
        return text_value(commit[id]).length;
      }),
    );
    const character_width =
      id === "message"
        ? MESSAGE_CHARACTER_WIDTH_PX
        : MONOSPACE_CHARACTER_WIDTH_PX;
    const width_px = Math.max(
      48,
      widest * character_width +
        COLUMN_HORIZONTAL_PADDING_PX +
        (id === "hash" ? HASH_COLUMN_SAFETY_PX : 0),
    );
    return id === "repository"
      ? COMPACT_COLUMN_WIDTH_PX
      : width_px;
  });
  const intrinsic_total = intrinsic.reduce((sum, width) => sum + width, 0);
  const target_width = Math.max(
    intrinsic_total,
    available_width || intrinsic_total,
  );
  const flexible_indices = COMMIT_FIELDS.map((field, index) =>
    field[0] === "repository" ? null : index,
  ).filter((index) => index !== null);
  const flexible_total = flexible_indices.reduce(
    (sum, index) => sum + intrinsic[index],
    0,
  );
  const flexible_target = Math.max(
    0,
    target_width - COMPACT_COLUMN_WIDTH_PX,
  );
  return COMMIT_FIELDS.map(([id, label_key, type, align], index) => {
    const width_px =
      id === "repository"
        ? COMPACT_COLUMN_WIDTH_PX
        : Math.round((flexible_target * intrinsic[index]) / flexible_total);
    return {
      id,
      label_key,
      type,
      align,
      width_px,
      max_width_px: width_px,
      style: {
        backgroundColor: "white",
        fontFamily: "monospace",
        cursor: "default",
        // CoolTable is shared by dark and light surfaces. Keep this
        // table readable even when an ancestor supplies a light-text
        // color (the white cell background otherwise makes the rows
        // appear empty).
        color: "black",
        whiteSpace: "nowrap",
        overflowWrap: "normal",
        wordBreak: "normal",
        overflow: "hidden",
        textOverflow: "ellipsis",
        lineHeight: "20px",
        maxHeight: "20px",
        height: "20px",
        verticalAlign: "top",
        ...(id === "message" || id === "date"
          ? {
              fontFamily: "sans-serif",
              fontSize: id === "date" ? "0.85rem" : "1.125rem",
              fontStyle: "italic",
              color: "#666666",
              letterSpacing: "1px",
              userSelect: "text",
            }
          : {}),
        ...(id === "repository"
          ? {
              textTransform: "uppercase",
              fontWeight: "bold",
              color: "black",
              letterSpacing: "1px",
            }
          : {}),
        ...(id === "change_summary"
          ? {
              fontFamily: "sans-serif",
              color: "#666666",
            }
          : {}),
      },
    };
  });
};

const render_tag_marker = (row, row_index) => {
  if (row?.row_type !== "tag_event" || !row.tag_event) return null;
  const { name, created_at } = row.tag_event;
  return (
    <table_styles.TableRow
      key={`tag-marker-${name}-${row_index}`}
      style={{ display: "block", width: "100%" }}
    >
      <table_styles.TableCell
        style={{
          display: "block",
          width: "100%",
          boxSizing: "border-box",
          height: "20px",
          padding: "0 0.5rem",
          lineHeight: "20px",
          textAlign: "center",
          backgroundColor: "#eef7f3",
          borderTop: "1px solid #76a88f",
          borderBottom: "1px solid #76a88f",
          color: "#315c47",
          fontFamily: "monospace",
          fontSize: "0.8rem",
          fontWeight: "bold",
          letterSpacing: "1px",
          maxHeight: "20px",
        }}
      >
        <span title={created_at ? new Date(created_at).toLocaleString() : ""}>
          {name}
        </span>
      </table_styles.TableCell>
    </table_styles.TableRow>
  );
};

const build_commit_row = (commit) => ({
  ...commit,
  repository: [render_repository_link, commit.repository],
  hash: [
    render_commit_hash,
    { hash: commit.hash, repository: commit.repository },
  ],
  date: [render_commit_date, commit.date],
  change_summary: [render_change_summary, commit],
});

export class AdminCommits extends Component {
  state = {
    commits: [],
    tag_events: [],
    commits_error: null,
    rendered_width: 0,
    repository_visibility: Object.fromEntries(
      REPOSITORY_NAMES.map((name) => [name, true]),
    ),
    table_ref: React.createRef(),
  };

  componentDidMount() {
    const saved_visibility =
      AppSettings.get(KEY_ADMIN_COMMITS_REPOSITORY_VISIBILITY) || {};
    this.setState({
      repository_visibility: {
        ...this.state.repository_visibility,
        ...saved_visibility,
      },
    });
    this.update_width();
    AdminBackend.commits()
      .then((result) => {
        const commits = Array.isArray(result?.commits) ? result.commits : [];
        const tag_events = Array.isArray(result?.tag_events)
          ? result.tag_events
          : [];
        this.setState({ commits, tag_events }, this.update_width);
      })
      .catch((commits_error) => {
        this.setState({ commits_error });
      });
  }

  componentWillUnmount() {
    this.unmounted = true;
  }

  update_width = () => {
    if (!this.unmounted && this.state.table_ref.current) {
      this.setState({
        rendered_width: this.state.table_ref.current.clientWidth,
      });
    }
  };

  toggle_repository = (repository) => {
    this.setState(
      ({ repository_visibility }) => ({
        repository_visibility: {
          ...repository_visibility,
          [repository]: !repository_visibility[repository],
        },
      }),
      () => {
        AppSettings.on_settings_changed({
          [KEY_ADMIN_COMMITS_REPOSITORY_VISIBILITY]:
            this.state.repository_visibility,
        });
      },
    );
  };

  set_all_repositories = (visible) => {
    const repository_visibility = Object.fromEntries(
      REPOSITORY_NAMES.map((name) => [name, visible]),
    );
    this.setState({ repository_visibility }, () => {
      AppSettings.on_settings_changed({
        [KEY_ADMIN_COMMITS_REPOSITORY_VISIBILITY]: repository_visibility,
      });
    });
  };

  render() {
    const {
      commits,
      tag_events,
      commits_error,
      rendered_width,
      repository_visibility,
      table_ref,
    } = this.state;
    const visible_commits = commits.filter(
      (commit) => repository_visibility[commit.repository] !== false,
    );
    const any_repository_visible = REPOSITORY_NAMES.some(
      (repository) => repository_visibility[repository] !== false,
    );
    const any_repository_hidden = REPOSITORY_NAMES.some(
      (repository) => repository_visibility[repository] === false,
    );
    const commit_rows = merge_commit_timeline({
      commits: visible_commits,
      tag_events,
      repository_visibility,
      create_commit_row: build_commit_row,
    });
    return (
      <>
        <styles.SectionTitle
          style={{
            position: "sticky",
            top: 0,
            zIndex: 3,
            backgroundColor: "#fcfcfc",
          }}
          key={"admin-commits-title"}
        >
          {AppText.get(KEY_ADMIN_COMMITS_TITLE)}
        </styles.SectionTitle>
        <CoolStyles.Block
          ref={table_ref}
          style={{
            width: "100%",
            height: "calc(100% - 75px)",
            overflow: "hidden",
          }}
        >
          <CoolStyles.Block
            style={{
              height: `${TABLE_HEADER_SPACE_PX}px`,
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "0 1rem",
              position: "sticky",
              top: 0,
              zIndex: 2,
              backgroundColor: "#fcfcfc",
            }}
          >
            {REPOSITORY_NAMES.map((repository) => (
              <label
                key={`repository-filter-${repository}`}
                style={{ ...SETTING_LABEL_STYLE, ...CELL_LABEL_STYLE }}
              >
                <input
                  type="checkbox"
                  checked={repository_visibility[repository] !== false}
                  onChange={() => this.toggle_repository(repository)}
                />
                <span style={{ marginLeft: "0.35rem", ...CELL_LABEL_STYLE }}>
                  {repository_label(repository)}
                </span>
              </label>
            ))}
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                if (any_repository_hidden) this.set_all_repositories(true);
              }}
              style={{
                ...CELL_LABEL_STYLE,
                color: any_repository_hidden ? "blue" : "#999999",
                cursor: any_repository_hidden ? "pointer" : "default",
              }}
            >
              {AppText.get(KEY_ADMIN_REPOSITORY_ALL)}
            </a>
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                if (any_repository_visible) this.set_all_repositories(false);
              }}
              style={{
                ...CELL_LABEL_STYLE,
                color: any_repository_visible ? "blue" : "#999999",
                cursor: any_repository_visible ? "pointer" : "default",
              }}
            >
              {AppText.get(KEY_ADMIN_REPOSITORY_NONE)}
            </a>
          </CoolStyles.Block>
          {commits_error && (
            <CoolStyles.Block>
              {AppText.get(KEY_ADMIN_COMMITS_ERROR)} {commits_error.message}
            </CoolStyles.Block>
          )}
          {!commits_error && !commits.length && (
            <CoolStyles.Block>
              {AppText.get(KEY_ADMIN_COMMITS_LOADING)}
            </CoolStyles.Block>
          )}
          {!!commits.length && (
            <CoolTable
              columns={commit_columns(visible_commits, rendered_width)}
              data={commit_rows}
              render_special_row={render_tag_marker}
              table_style={{
                width: "100%",
                height: `calc(100% - ${TABLE_HEADER_SPACE_PX}px)`,
                backgroundColor: "white",
                color: "black",
              }}
            />
          )}
        </CoolStyles.Block>
      </>
    );
  }
}

export default AdminCommits;
