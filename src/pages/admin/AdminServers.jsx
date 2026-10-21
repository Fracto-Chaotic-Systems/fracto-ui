import AdminServerClients from "./AdminServerClients.jsx";
import AdminServerTime from "./AdminServerTime.jsx";
import { server_times, format_server_uptime } from "./AdminServerTimes.js";
import AdminServerRole from "./AdminServerRole.jsx";
import AdminServerTitle from "./AdminServerTitle.jsx";
import { server_title, update_server_title } from "./AdminServerTitles.js";
import { render_server_template } from "./AdminServersTemplate.js";
export { render_server_template } from "./AdminServersTemplate.js";
import { Component } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styled from "styled-components";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import AppSettings from "../../AppSettings.jsx";
import {
  KEY_ADMIN_SERVERS_ADDRESS_BOOK,
  KEY_ADMIN_SERVERS_TITLES,
  KEY_ADMIN_SERVERS_ROLES,
  KEY_ADMIN_SERVERS_SELECTION,
} from "../../settings/AdminSettings.jsx";
import {
  KEY_ADMIN_SERVERS_ADMIN_SERVER,
  KEY_ADMIN_SERVERS_ADD_SERVER,
  KEY_ADMIN_SERVERS_ASSET_SERVER,
  KEY_ADMIN_SERVERS_CANCEL_URL,
  KEY_ADMIN_SERVERS_CHECKED_LABEL,
  KEY_ADMIN_SERVERS_CONFIRM_URL,
  KEY_ADMIN_SERVERS_DATA_SERVER,
  KEY_ADMIN_SERVERS_DEPENDENT_HEALTH_TITLE,
  KEY_ADMIN_SERVERS_HEALTH_LABEL,
  KEY_ADMIN_SERVERS_HEALTH_REFRESH_NOTE,
  KEY_ADMIN_SERVERS_INVALID_URL,
  KEY_ADMIN_SERVERS_MAIN_SERVER_ROLE,
  KEY_ADMIN_SERVERS_PUBLIC_ADDRESS_LABEL,
  KEY_ADMIN_SERVERS_REFRESH_ERROR,
  KEY_ADMIN_SERVERS_ROLE_LABEL,
  KEY_ADMIN_SERVERS_SCOPE_NOTE,
  KEY_ADMIN_SERVERS_SECONDS,
  KEY_ADMIN_SERVERS_STARTED_LABEL,
  KEY_ADMIN_SERVERS_STATUS_DEGRADED,
  KEY_ADMIN_SERVERS_STATUS_FAILED,
  KEY_ADMIN_SERVERS_STATUS_HEALTHY,
  KEY_ADMIN_SERVERS_STATUS_READY,
  KEY_ADMIN_SERVERS_STATUS_STARTING,
  KEY_ADMIN_SERVERS_STATUS_STOPPED,
  KEY_ADMIN_SERVERS_THIS_SERVER,
  KEY_ADMIN_SERVERS_TILES_SERVER,
  KEY_ADMIN_SERVERS_TITLE,
  KEY_ADMIN_SERVERS_UI_SERVER,
  KEY_ADMIN_SERVERS_UNAVAILABLE,
  KEY_ADMIN_SERVERS_SERVER_URL_PLACEHOLDER,
  KEY_ADMIN_SERVERS_URL_ACCEPTED,
  KEY_ADMIN_SERVERS_UPTIME_LABEL,
  KEY_ADMIN_SERVERS_VERSION_LABEL,
} from "../../text/AdminText.jsx";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";
import MarkdownStyles from "../../utils/ui/styles/MarkdownStyles.jsx";
import CoolTree from "../../utils/ui/CoolTree.jsx";
import CoolButton from "../../utils/ui/CoolButton.jsx";
import CoolInputText from "../../utils/ui/CoolInputText.jsx";
import ServerBackend from "../../backend/ServerBackend.jsx";
import {
  clear_server_url_entry_state,
  get_remote_server_name,
  merge_server_url,
  is_health_contract_v1,
  normalize_server_url,
  normalize_server_urls,
} from "./AdminServersUtils.js";
import server_template from "./AdminServers.md?raw";

const REFRESH_INTERVAL_MS = 5000;
const THIS_SERVER_KEY = "this-server";
const SERVICE_NAMES = [
  "fracto-data-server",
  "fracto-asset-server",
  "fracto-admin-server",
  "fracto-ui",
  "fracto-tiles-server",
];
const make_server_tree = (
  server_urls,
  remote_health,
  local_server_name,
  titles,
  local_health,
  local_error,
) => {
  const entry = (key, title, health, error) => {
    const healthy = !error && ["ready", "healthy"].includes(health?.status);
    const status = get_health_status_label(error ? null : health?.status);
    return {
      key,
      label: title,
      isLeaf: true,
      title: (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span
            role="img"
            aria-label={status}
            title={status}
            style={{
              color: healthy ? "#228b22" : "#b22222",
              fontWeight: "bold",
            }}
          >
            {healthy ? "✓" : "×"}
          </span>
          <span>{title}</span>
        </span>
      ),
    };
  };
  return [
    {
      key: "servers-root",
      title: "servers-root",
      isLeaf: false,
      children: [
        entry(THIS_SERVER_KEY, local_server_name, local_health, local_error),
        ...server_urls.map((url) =>
          entry(
            `server:${url}`,
            server_title(
              titles,
              url,
              get_remote_server_name(remote_health[url]?.health, url) ||
                AppText.get(KEY_ADMIN_SERVERS_UNAVAILABLE),
            ),
            remote_health[url]?.health,
            remote_health[url]?.error,
          ),
        ),
      ],
    },
  ];
};
const documentation_layout = {
  content: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "calc(100vh - 75px)",
    minHeight: 0,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    flex: "0 0 35px",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "0.5rem",
    width: "100%",
    height: "35px",
    minHeight: "35px",
    padding: "0 0.5rem",
    overflow: "hidden",
    borderBottom: "1px solid #cccccc",
    boxSizing: "border-box",
  },
  panes: {
    display: "flex",
    flex: "1 1 0",
    width: "100%",
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
const ServersTreeWrapper = styled(CoolStyles.Block)`
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
  a: AdminServerTime,
  code: MarkdownStyles.InlineCode,
  pre: MarkdownStyles.CodeBlock,
  table: MarkdownStyles.Table,
  thead: MarkdownStyles.TableHead,
  th: MarkdownStyles.TableHeader,
  tr: MarkdownStyles.TableRow,
  td: MarkdownStyles.TableCell,
  hr: MarkdownStyles.HorizontalRule,
};
const STATUS_TEXT_KEYS = {
  ready: KEY_ADMIN_SERVERS_STATUS_READY,
  starting: KEY_ADMIN_SERVERS_STATUS_STARTING,
  healthy: KEY_ADMIN_SERVERS_STATUS_HEALTHY,
  degraded: KEY_ADMIN_SERVERS_STATUS_DEGRADED,
  stopped: KEY_ADMIN_SERVERS_STATUS_STOPPED,
  failed: KEY_ADMIN_SERVERS_STATUS_FAILED,
};
const get_health_status_label = (status) => {
  const status_key = STATUS_TEXT_KEYS[status];
  return AppText.get(status_key || KEY_ADMIN_SERVERS_UNAVAILABLE);
};
const LOCALIZED_TEXT_KEYS = {
  role_label: KEY_ADMIN_SERVERS_ROLE_LABEL,
  public_address_label: KEY_ADMIN_SERVERS_PUBLIC_ADDRESS_LABEL,
  health_label: KEY_ADMIN_SERVERS_HEALTH_LABEL,
  version_label: KEY_ADMIN_SERVERS_VERSION_LABEL,
  uptime_label: KEY_ADMIN_SERVERS_UPTIME_LABEL,
  started_label: KEY_ADMIN_SERVERS_STARTED_LABEL,
  checked_label: KEY_ADMIN_SERVERS_CHECKED_LABEL,
  scope_note: KEY_ADMIN_SERVERS_SCOPE_NOTE,
  dependent_health_title: KEY_ADMIN_SERVERS_DEPENDENT_HEALTH_TITLE,
  health_refresh_note: KEY_ADMIN_SERVERS_HEALTH_REFRESH_NOTE,
  data_server: KEY_ADMIN_SERVERS_DATA_SERVER,
  asset_server: KEY_ADMIN_SERVERS_ASSET_SERVER,
  admin_server: KEY_ADMIN_SERVERS_ADMIN_SERVER,
  ui_server: KEY_ADMIN_SERVERS_UI_SERVER,
  tiles_server: KEY_ADMIN_SERVERS_TILES_SERVER,
  main_server_role: KEY_ADMIN_SERVERS_MAIN_SERVER_ROLE,
  unavailable: KEY_ADMIN_SERVERS_UNAVAILABLE,
  seconds: KEY_ADMIN_SERVERS_SECONDS,
  ...Object.fromEntries(
    Object.entries(STATUS_TEXT_KEYS).map(([status, key]) => [
      `status_${status}`,
      key,
    ]),
  ),
};

const make_template_values = (health, checked_at, server_name, public_url) => {
  const timestamps = server_times(health, checked_at);
  const localize_status = (status) => {
    const key = STATUS_TEXT_KEYS[status];
    return key
      ? AppText.get(key)
      : status || AppText.get(KEY_ADMIN_SERVERS_UNAVAILABLE);
  };
  const services = Object.fromEntries(
    SERVICE_NAMES.map((name) => [
      name,
      localize_status(health?.services?.[name]),
    ]),
  );
  const text = Object.fromEntries(
    Object.entries(LOCALIZED_TEXT_KEYS).map(([key, text_key]) => [
      key,
      AppText.get(text_key),
    ]),
  );
  return {
    text,
    server: {
      name: server_name,
      role: AppText.get(KEY_ADMIN_SERVERS_MAIN_SERVER_ROLE),
      public_url: public_url || text.unavailable,
      status: localize_status(health?.status),
      version: health?.build_info?.version || text.unavailable,
      uptime: format_server_uptime(health?.uptime_seconds) || text.unavailable,
      started_at: timestamps.started_at || text.unavailable,
      checked_at: timestamps.checked_at || text.unavailable,
    },
    health: services,
  };
};

/** Shows this Fracto main server and its five dependent service health checks. */
export class AdminServers extends Component {
  state = {
    selected_server: "",
    server_titles: {},
    server_roles: {},
    health: null,
    remote_health: {},
    checked_at: null,
    error: null,
    adding_server: false,
    server_url_draft: "",
    server_urls: [],
    url_error: null,
    input_generation: 0,
  };

  componentDidMount() {
    this.unmounted = false;
    const server_urls = this.get_saved_server_urls();
    this.setState({
      server_urls,
      server_titles: AppSettings.get(KEY_ADMIN_SERVERS_TITLES) || {},
      server_roles: AppSettings.get(KEY_ADMIN_SERVERS_ROLES) || {},
    });
    const address_book = AppSettings.get(KEY_ADMIN_SERVERS_ADDRESS_BOOK);
    if (
      JSON.stringify(address_book) !== JSON.stringify({ urls: server_urls })
    ) {
      AppSettings.on_settings_changed({
        [KEY_ADMIN_SERVERS_ADDRESS_BOOK]: { urls: server_urls },
      });
    }
    const saved_selection = AppSettings.get(KEY_ADMIN_SERVERS_SELECTION);
    this.setState({
      selected_server:
        saved_selection === THIS_SERVER_KEY ||
        server_urls.includes(saved_selection)
          ? saved_selection
          : "",
    });
    this.refresh();
    this.refresh_remote_servers(server_urls);
    this.refresh_interval = setInterval(this.refresh, REFRESH_INTERVAL_MS);
    this.remote_refresh_interval = setInterval(
      () => this.refresh_remote_servers(),
      REFRESH_INTERVAL_MS,
    );
  }

  componentWillUnmount() {
    this.unmounted = true;
    clearInterval(this.refresh_interval);
    clearInterval(this.remote_refresh_interval);
  }

  on_tree_select = (selected_keys) => {
    const selection = selected_keys[0] || "";
    const selected_server = !selection
      ? ""
      : selection === THIS_SERVER_KEY
        ? THIS_SERVER_KEY
        : selection.slice(7);
    AppSettings.on_settings_changed({
      [KEY_ADMIN_SERVERS_SELECTION]: selected_server,
    });
    this.setState({ selected_server });
  };

  get_selected_title = () => {
    const { selected_server, server_titles, health, remote_health } =
      this.state;
    if (!selected_server) return "";
    const fallback =
      selected_server === THIS_SERVER_KEY
        ? (typeof health?.server_name === "string" &&
            health.server_name.trim()) ||
          AppText.get(KEY_ADMIN_SERVERS_THIS_SERVER)
        : get_remote_server_name(
            remote_health[selected_server]?.health,
            selected_server,
          ) || AppText.get(KEY_ADMIN_SERVERS_UNAVAILABLE);
    return server_title(server_titles, selected_server, fallback);
  };
  render_server_title = () => (
    <>
      <AdminServerTitle
        key={this.state.selected_server}
        title={this.get_selected_title()}
        on_save={this.save_server_title}
      />
      <AdminServerRole
        key={`role:${this.state.selected_server}`}
        role={server_title(
          this.state.server_roles,
          this.state.selected_server,
          AppText.get(KEY_ADMIN_SERVERS_MAIN_SERVER_ROLE),
        )}
        on_save={this.save_server_role}
      />
    </>
  );

  save_server_role = (value) => {
    const server_roles = update_server_title(
      AppSettings.get(KEY_ADMIN_SERVERS_ROLES) || {},
      this.state.selected_server,
      value,
    );
    AppSettings.on_settings_changed({
      [KEY_ADMIN_SERVERS_ROLES]: server_roles,
    });
    this.setState({ server_roles });
  };

  save_server_title = (value) => {
    const server_titles = update_server_title(
      AppSettings.get(KEY_ADMIN_SERVERS_TITLES) || {},
      this.state.selected_server,
      value,
    );
    AppSettings.on_settings_changed({
      [KEY_ADMIN_SERVERS_TITLES]: server_titles,
    });
    this.setState({ server_titles });
  };

  open_server_url_entry = () => {
    this.setState({
      adding_server: true,
      server_url_draft: "",
      url_error: null,
    });
  };

  get_saved_server_urls = () => {
    const address_book = AppSettings.get(KEY_ADMIN_SERVERS_ADDRESS_BOOK);
    return normalize_server_urls(address_book);
  };

  cancel_server_url_entry = () => {
    this.setState((state) => clear_server_url_entry_state(state));
  };

  accept_server_url = (value) => {
    const current_address_book = AppSettings.get(
      KEY_ADMIN_SERVERS_ADDRESS_BOOK,
    );
    const current_urls = normalize_server_urls(current_address_book);
    const accepted_url = normalize_server_url(value);
    const { accepted, address_book } = merge_server_url(
      current_address_book,
      value,
    );
    if (!accepted) {
      this.setState((state) => ({
        url_error: AppText.get(KEY_ADMIN_SERVERS_INVALID_URL),
        input_generation: state.input_generation + 1,
      }));
      return;
    }
    const server_urls = address_book.urls;
    AppSettings.on_settings_changed({
      [KEY_ADMIN_SERVERS_ADDRESS_BOOK]: address_book,
    });
    this.setState({
      adding_server: false,
      server_url_draft: "",
      server_urls,
      url_error: null,
    });
    if (!current_urls.includes(accepted_url)) {
      this.refresh_remote_servers(server_urls);
    }
  };

  refresh = async () => {
    if (this.refreshing) return;
    this.refreshing = true;
    const checked_at = new Date();
    try {
      const health = await ServerBackend.health();
      if (!this.unmounted) this.setState({ health, checked_at, error: null });
    } catch (error) {
      if (!this.unmounted) {
        this.setState({
          health: null,
          checked_at: new Date(),
          error: error.message,
        });
      }
    } finally {
      this.refreshing = false;
    }
  };

  refresh_remote_servers = async (
    server_urls = this.get_saved_server_urls(),
  ) => {
    if (this.remote_refreshing) return;
    this.remote_refreshing = true;
    const checked_at = new Date();
    try {
      const entries = await Promise.all(
        server_urls.map(async (url) => {
          try {
            const health = await ServerBackend.health_at(url);
            if (!is_health_contract_v1(health)) {
              throw new Error("Unsupported server health contract");
            }
            return [url, { health, checked_at, error: null }];
          } catch (error) {
            return [url, { health: null, checked_at, error: error.message }];
          }
        }),
      );
      if (!this.unmounted) {
        this.setState({ remote_health: Object.fromEntries(entries) });
      }
    } finally {
      this.remote_refreshing = false;
    }
  };

  render() {
    const {
      selected_server,
      health,
      remote_health,
      checked_at,
      error,
      adding_server,
      server_url_draft,
      server_urls,
      url_error,
      input_generation,
      server_titles,
    } = this.state;
    const server_name = server_title(
      server_titles,
      THIS_SERVER_KEY,
      (typeof health?.server_name === "string" && health.server_name.trim()) ||
        AppText.get(KEY_ADMIN_SERVERS_THIS_SERVER),
    );
    const server_tree = make_server_tree(
      server_urls,
      remote_health,
      server_name,
      server_titles,
      health,
      error,
    );
    const is_local_server = selected_server === THIS_SERVER_KEY;
    const selected_remote = is_local_server
      ? null
      : remote_health[selected_server];
    const selected_health = is_local_server ? health : selected_remote?.health;
    const selected_checked_at = is_local_server
      ? checked_at
      : selected_remote?.checked_at;
    const selected_name = this.get_selected_title();
    const selected_url = is_local_server
      ? globalThis.location?.origin
      : selected_server;
    const selected_tree_key = is_local_server
      ? THIS_SERVER_KEY
      : selected_server
        ? `server:${selected_server}`
        : "";
    const values = selected_server
      ? make_template_values(
          selected_health,
          selected_checked_at,
          selected_name,
          selected_url,
        )
      : null;
    const markdown = values
      ? render_server_template(server_template, values)
      : "";
    return (
      <CoolStyles.Block style={{ height: "100%", overflow: "hidden" }}>
        <styles.SectionTitle>
          {AppText.get(KEY_ADMIN_SERVERS_TITLE)}
        </styles.SectionTitle>
        <styles.ContentWrapper style={documentation_layout.content}>
          <styles.ContentWrapper style={documentation_layout.header}>
            {adding_server ? (
              <CoolInputText
                key={`server-url-entry-${input_generation}`}
                value={server_url_draft}
                on_change={(server_url_draft) =>
                  this.setState({ server_url_draft })
                }
                placeholder={AppText.get(
                  KEY_ADMIN_SERVERS_SERVER_URL_PLACEHOLDER,
                )}
                style_extra={{
                  boxSizing: "border-box",
                  width: "16rem",
                  height: "22px",
                }}
                actions={{
                  on_confirm: this.accept_server_url,
                  on_cancel: this.cancel_server_url_entry,
                  confirm_title: AppText.get(KEY_ADMIN_SERVERS_CONFIRM_URL),
                  cancel_title: AppText.get(KEY_ADMIN_SERVERS_CANCEL_URL),
                }}
              />
            ) : (
              <CoolButton
                content={AppText.get(KEY_ADMIN_SERVERS_ADD_SERVER)}
                on_click={this.open_server_url_entry}
                title={AppText.get(KEY_ADMIN_SERVERS_ADD_SERVER)}
                aria_label={AppText.get(KEY_ADMIN_SERVERS_ADD_SERVER)}
                style={{ margin: 0, padding: "0 0.5rem", lineHeight: "20px" }}
              />
            )}
            {server_urls.length > 0 && (
              <span
                title={server_urls.join("\n")}
                style={{
                  flex: "1 1 auto",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "0.75rem",
                  fontWeight: "normal",
                }}
                aria-live="polite"
              >
                {AppText.get(KEY_ADMIN_SERVERS_URL_ACCEPTED)}{" "}
                {server_urls[server_urls.length - 1]}
              </span>
            )}
          </styles.ContentWrapper>
          <styles.ContentWrapper style={documentation_layout.panes}>
            <styles.ContentWrapper style={documentation_layout.tree}>
              <ServersTreeWrapper>
                <CoolTree
                  tree_data={server_tree}
                  label_depth_indent_px={16}
                  label_depth_offset_px={1}
                  root_leaf_margin_left_px={0}
                  selected_keys={selected_tree_key ? [selected_tree_key] : []}
                  on_select={this.on_tree_select}
                  selectable
                  searchable
                  show_live_description={false}
                  tree_label={AppText.get(KEY_ADMIN_SERVERS_TITLE)}
                />
              </ServersTreeWrapper>
            </styles.ContentWrapper>
            <styles.ContentWrapper style={documentation_layout.markdown}>
              {url_error && (
                <div
                  role="alert"
                  style={{ color: "#b22222", marginBottom: "0.75rem" }}
                >
                  {url_error}
                </div>
              )}
              {(is_local_server ? error : selected_remote?.error) && (
                <div
                  role="status"
                  style={{ color: "#b22222", marginBottom: "0.75rem" }}
                >
                  {AppText.get(KEY_ADMIN_SERVERS_REFRESH_ERROR)}{" "}
                  {is_local_server ? error : selected_remote?.error}
                </div>
              )}
              {markdown && (
                <MarkdownStyles.Document
                  style={documentation_layout.markdown_text}
                >
                  <ReactMarkdown
                    components={{
                      ...markdown_components,
                      h1: this.render_server_title,
                    }}
                    remarkPlugins={[remarkGfm]}
                  >
                    {markdown}
                  </ReactMarkdown>
                </MarkdownStyles.Document>
              )}
              {selected_server && (
                <AdminServerClients
                  key={selected_server}
                  server_url={is_local_server ? undefined : selected_server}
                />
              )}
            </styles.ContentWrapper>
          </styles.ContentWrapper>
        </styles.ContentWrapper>
      </CoolStyles.Block>
    );
  }
}

export default AdminServers;
