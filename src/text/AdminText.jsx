const ADMIN_FOLDER = "admin";
const SYNC_PEER_CONFIGURATION_ERROR =
  "FRACTO_DATABASE_SYNC_PEERS must be a JSON object mapping server URLs to endpoint and token entries. Setting it to true does not configure a peer. Correct the setting and recreate the server container to load the new environment.";
export const MESH_SYNC_TEXT = {
  title: "Mesh file synchronization",
  conflict_preview: "Showing conflict examples:",
  note: "Share validated mesh files in both directions. Numerical tiles, database tables, and each server’s inventory journals stay local. Both servers must use the same mesh build profile and tile-source identity.",
  setup:
    "Configure this server as a trusted sync peer on both servers to share meshes.",
  preview: "Preview mesh sync",
  sync: "Sync mesh files",
  working: "Working…",
  conflict_note:
    "These short codes have different mesh files. Choose which server’s files to keep for all conflicts. Files unique to either server will be shared.",
  choose: "Choose mesh conflict preference",
  local: "Keep this server’s conflicting meshes",
  remote: "Keep selected server’s conflicting meshes",
  conflict: "conflicts",
  table: "Mesh level",
  local_rows: "This server",
  remote_rows: "Selected server",
  merged_rows: "Shared meshes",
  local_key: "This server’s checksum",
  remote_key: "Selected server’s checksum",
  changed: "Comparison",
  locking:
    "Mesh generation must be idle on both servers. It is blocked while sync holds each mesh store. Changes since this preview require a fresh preview.",
  complete:
    "Mesh sync complete. Both servers have matching validated mesh files, registered in their live inventories.",
  partial:
    "Some mesh files may already have been shared. Preview again and retry; files whose checksums already match will be skipped.",
  files: "files",
  bytes: "mesh bytes",
  skipped: "Unusable or stale source files excluded from sharing:",
  errors: {
    invalid_sync_peer_configuration: SYNC_PEER_CONFIGURATION_ERROR,
    "HTTP 401":
      "An administrator login is required. For an isolated anonymous lab, enable FRACTO_ADMIN_SYNC_LAB_BYPASS with the exact UI origin on that server.",
    "Untrusted request origin":
      "This page’s address does not match FRACTO_UI_ORIGIN. Open the configured UI address or update that setting and recreate the container.",
    mesh_source_mismatch:
      "Mesh source identities or build profiles differ. Configure matching tile-source generations and rebuild profiles before sharing meshes.",
    mesh_jobs_active:
      "Mesh generation or another mesh sync is active. Wait for it to finish on both servers before previewing.",
    mesh_sync_busy: "Another mesh sync is in progress. Wait for it to finish.",
    mesh_snapshot_changed:
      "Mesh files changed after the preview. Preview again before syncing.",
    mesh_checksum_mismatch:
      "A transferred mesh failed checksum validation. Preview again and retry.",
    mesh_internal_token_missing:
      "Configure the private internal service token so the admin service can contact its local mesh store.",
    mesh_session_expired:
      "The mesh store session expired or its service restarted. Preview again and retry.",
    mesh_catalog_incompatible:
      "The peer does not provide a compatible mesh inventory. Install matching sync code on both servers.",
    mesh_catalog_limit:
      "This mesh inventory exceeds the supported catalog size. No successful sync was reported.",
    mesh_transfer_limit:
      "The mesh catalog or file transfer exceeds the supported size. No files were silently skipped.",
    mesh_file_limit:
      "A mesh exceeds the supported transfer size. No file was silently skipped.",
    unsafe_mesh_path:
      "A mesh destination is not a regular file or directory. Repair the mesh store path before retrying.",
    sync_peer_not_configured:
      "This server is not configured as a trusted sync peer.",
    sync_plan_expired: "The mesh preview expired. Run a fresh preview.",
    default:
      "Unable to share meshes. Check peer connectivity, mesh storage, and the sync configuration, then preview again.",
  },
};
export const DATABASE_SYNC_TEXT = {
  conflict_preview: "Showing conflict examples:",
  title: "Database synchronization",
  note: "Merge this server’s database with the selected server. Tables and migration checksums must match. The tiles and automation tables stay local.",
  setup:
    "This server is not configured as a trusted synchronization peer. Configure the peer connection on both servers to enable sync.",
  preview: "Preview sync",
  sync: "Sync both servers",
  working: "Working…",
  conflict_note:
    "Conflicting rows have the same primary or unique key but different data. Choose which server’s rows to keep for all conflicts; rows unique to either server are retained.",
  choose: "Choose conflict preference",
  local: "Keep this server’s conflicting rows",
  remote: "Keep selected server’s conflicting rows",
  conflict: "conflicts",
  table: "Table",
  local_rows: "This server",
  remote_rows: "Selected server",
  merged_rows: "Merged rows (this server preferred)",
  local_key: "This server’s key",
  remote_key: "Selected server’s key",
  changed: "Different columns",
  locking:
    "Sync temporarily blocks writes to the included tables on both servers. Pause job runs before applying. Data changes after this preview require a fresh preview.",
  complete:
    "Synchronization complete. Both servers have matching data in every included table.",
  partial:
    "Synchronization did not complete on both servers. One server may already contain the merge. Preview again and retry to bring them together.",
  errors: {
    invalid_sync_peer_configuration: SYNC_PEER_CONFIGURATION_ERROR,
    "HTTP 401":
      "An administrator login is required. For an isolated anonymous lab, enable FRACTO_ADMIN_SYNC_LAB_BYPASS with the exact UI origin on that server.",
    "Untrusted request origin":
      "This page’s address does not match FRACTO_UI_ORIGIN. Open the configured UI address or update that setting and recreate the container.",
    migration_version_mismatch:
      "The servers have different migration versions or checksums. Install identical migrations on both before syncing.",
    sync_protocol_mismatch:
      "The servers use different database sync protocol versions. Update the sync code on both servers before previewing.",
    table_definitions_mismatch:
      "The installed tables or their definitions differ. Install and migrate matching tables on both servers first.",
    migrations_not_installed:
      "The migration history is missing. Install and migrate both databases first.",
    sync_snapshot_changed:
      "Data changed after the preview. Run a fresh preview before syncing.",
    database_sync_busy:
      "Another sync is holding this database. Wait for it to finish, then preview again.",
    sync_snapshot_limit:
      "The database exceeds this sync operation’s bounded transfer size. No successful sync has been reported.",
    sync_peer_not_configured:
      "This server is not configured as a trusted synchronization peer.",
    foreign_key_conflict:
      "The selected rows would leave broken references. Resolve the conflicting keys before trying again.",
    sync_plan_expired: "This preview expired. Run a fresh preview.",
    sync_plan_limit:
      "Existing previews must expire before another can be created.",
    sync_requires_primary_keys:
      "Every included table must have a primary key before synchronization.",
    sync_requires_innodb_tables:
      "Every included table must be an InnoDB table before synchronization.",
    sync_tables_have_triggers:
      "Synchronization cannot safely copy tables with triggers. No data was synchronized.",
    default:
      "Unable to synchronize. Check peer connectivity and configuration, then preview again.",
  },
};
export const KEY_ADMIN_SERVERS_AI_SERVER = `${ADMIN_FOLDER}/servers_ai_server`;
export const KEY_ADMIN_REPOSITORY_AI = `${ADMIN_FOLDER}/repository_ai`;
export const KEY_ADMIN_SERVERS_CLIENTS_TITLE = `${ADMIN_FOLDER}/servers_clients_title`;
export const KEY_ADMIN_SERVERS_CLIENTS_NOTE = `${ADMIN_FOLDER}/servers_clients_note`;
export const KEY_ADMIN_SERVERS_CLIENTS_LOADING = `${ADMIN_FOLDER}/servers_clients_loading`;
export const KEY_ADMIN_SERVERS_CLIENTS_EMPTY = `${ADMIN_FOLDER}/servers_clients_empty`;
export const KEY_ADMIN_SERVERS_CLIENTS_ERROR = `${ADMIN_FOLDER}/servers_clients_error`;
export const KEY_ADMIN_SERVERS_CLIENTS_USER = `${ADMIN_FOLDER}/servers_clients_user`;
export const KEY_ADMIN_SERVERS_CLIENTS_BROWSER = `${ADMIN_FOLDER}/servers_clients_browser`;
export const KEY_ADMIN_SERVERS_CLIENTS_STARTED = `${ADMIN_FOLDER}/servers_clients_started`;
export const KEY_ADMIN_SERVERS_CLIENTS_SEEN = `${ADMIN_FOLDER}/servers_clients_seen`;
export const KEY_ADMIN_SERVERS_CLIENTS_EXPIRES = `${ADMIN_FOLDER}/servers_clients_expires`;
export const KEY_ADMIN_SERVERS_CLIENTS_REFRESH = `${ADMIN_FOLDER}/servers_clients_refresh`;
export const KEY_ADMIN_SERVERS_EDIT_ROLE = `${ADMIN_FOLDER}/servers_edit_role`;
export const KEY_ADMIN_SERVERS_SAVE_ROLE = `${ADMIN_FOLDER}/servers_save_role`;
export const KEY_ADMIN_SERVERS_CANCEL_ROLE = `${ADMIN_FOLDER}/servers_cancel_role`;
export const KEY_ADMIN_SERVERS_EDIT_TITLE = `${ADMIN_FOLDER}/servers_edit_title`;
export const KEY_ADMIN_SERVERS_SAVE_TITLE = `${ADMIN_FOLDER}/servers_save_title`;
export const KEY_ADMIN_SERVERS_CANCEL_TITLE = `${ADMIN_FOLDER}/servers_cancel_title`;

export const KEY_REFERENCE_TITLE = `${ADMIN_FOLDER}/reference`;
export const KEY_ADMIN_REFERENCE_LOADING = `${ADMIN_FOLDER}/reference_loading`;
export const KEY_ADMIN_REFERENCE_ERROR = `${ADMIN_FOLDER}/reference_error`;
export const KEY_ADMIN_REFERENCE_EMPTY = `${ADMIN_FOLDER}/reference_empty`;
export const KEY_COMMITS_TITLE = `${ADMIN_FOLDER}/commits`;
export const KEY_ADMIN_SOCIAL_TITLE = `${ADMIN_FOLDER}/social`;
export const KEY_ADMIN_SOCIAL_PAGE_TITLE = `${ADMIN_FOLDER}/social_page_title`;
export const KEY_ADMIN_SOCIAL_LOADING = `${ADMIN_FOLDER}/social_loading`;
export const KEY_ADMIN_SOCIAL_ERROR = `${ADMIN_FOLDER}/social_error`;
export const KEY_ADMIN_SOCIAL_REFRESH = `${ADMIN_FOLDER}/social_refresh`;
export const KEY_ADMIN_SOCIAL_REFRESHING = `${ADMIN_FOLDER}/social_refreshing`;
export const KEY_ADMIN_SOCIAL_LAST_REFRESHED = `${ADMIN_FOLDER}/social_last_refreshed`;
export const KEY_ADMIN_SOCIAL_STALE = `${ADMIN_FOLDER}/social_stale`;
export const KEY_ADMIN_SOCIAL_REFRESH_WARNING = `${ADMIN_FOLDER}/social_refresh_warning`;
export const KEY_ADMIN_ACCOUNTS = "admin/accounts";
export const KEY_ADMIN_ACCOUNTS_TITLE = "admin/accounts_title";
export const KEY_ADMIN_ACCOUNTS_LOADING = "admin/accounts_loading";
export const KEY_ADMIN_ACCOUNTS_ERROR = "admin/accounts_error";
export const KEY_ADMIN_ACCOUNTS_EMPTY = "admin/accounts_empty";
export const KEY_ADMIN_CHAT = "admin/chat";
export const KEY_ADMIN_CHAT_STATUS = "admin/chat_status";
export const KEY_ADMIN_CHAT_MODE = "admin/chat_mode";
export const KEY_ADMIN_CHAT_GENERAL = "admin/chat_general";
export const KEY_ADMIN_CHAT_REFERENCE = "admin/chat_reference";
export const KEY_ADMIN_CHAT_REFERENCE_NOTE = "admin/chat_reference_note";
export const KEY_ADMIN_CHAT_MODE_NOTE = "admin/chat_mode_note";
export const KEY_ADMIN_CHAT_EMPTY_TITLE = "admin/chat_empty_title";
export const KEY_ADMIN_CHAT_EMPTY_NOTE = "admin/chat_empty_note";
export const KEY_ADMIN_CHAT_PLACEHOLDER = "admin/chat_placeholder";
export const KEY_ADMIN_CHAT_ATTACH = "admin/chat_attach";
export const KEY_ADMIN_CHAT_REMOVE = "admin/chat_remove";
export const KEY_ADMIN_CHAT_SEND = "admin/chat_send";
export const KEY_ADMIN_CHAT_STOP = "admin/chat_stop";
export const KEY_ADMIN_CHAT_WORKING = "admin/chat_working";
export const KEY_ADMIN_CHAT_ERROR = "admin/chat_error";
export const KEY_ADMIN_CHAT_FILES_NOTE = "admin/chat_files_note";
export const KEY_ADMIN_CHAT_FILE_ERRORS = "admin/chat_file_errors";
export const KEY_ADMIN_CHAT_RESPONSE_ERRORS = "admin/chat_response_errors";
export const KEY_ADMIN_CHAT_TITLE = "admin/chat_title";
export const KEY_ADMIN_OVERVIEW = `${ADMIN_FOLDER}/admin_overview`;
export const KEY_ADMIN_SERVERS = `${ADMIN_FOLDER}/servers`;
export const KEY_ADMIN_SERVERS_TITLE = `${ADMIN_FOLDER}/servers_title`;
export const KEY_ADMIN_SERVERS_THIS_SERVER = `${ADMIN_FOLDER}/servers_this_server`;
export const KEY_ADMIN_SERVERS_ROLE_LABEL = `${ADMIN_FOLDER}/servers_role_label`;
export const KEY_ADMIN_SERVERS_PUBLIC_ADDRESS_LABEL = `${ADMIN_FOLDER}/servers_public_address_label`;
export const KEY_ADMIN_SERVERS_HEALTH_LABEL = `${ADMIN_FOLDER}/servers_health_label`;
export const KEY_ADMIN_SERVERS_VERSION_LABEL = `${ADMIN_FOLDER}/servers_version_label`;
export const KEY_ADMIN_SERVERS_UPTIME_LABEL = `${ADMIN_FOLDER}/servers_uptime_label`;
export const KEY_ADMIN_SERVERS_STARTED_LABEL = `${ADMIN_FOLDER}/servers_started_label`;
export const KEY_ADMIN_SERVERS_CHECKED_LABEL = `${ADMIN_FOLDER}/servers_checked_label`;
export const KEY_ADMIN_SERVERS_SCOPE_NOTE = `${ADMIN_FOLDER}/servers_scope_note`;
export const KEY_ADMIN_SERVERS_DEPENDENT_HEALTH_TITLE = `${ADMIN_FOLDER}/servers_dependent_health_title`;
export const KEY_ADMIN_SERVERS_HEALTH_REFRESH_NOTE = `${ADMIN_FOLDER}/servers_health_refresh_note`;
export const KEY_ADMIN_SERVERS_DATA_SERVER = `${ADMIN_FOLDER}/servers_data_server`;
export const KEY_ADMIN_SERVERS_ASSET_SERVER = `${ADMIN_FOLDER}/servers_asset_server`;
export const KEY_ADMIN_SERVERS_ADMIN_SERVER = `${ADMIN_FOLDER}/servers_admin_server`;
export const KEY_ADMIN_SERVERS_UI_SERVER = `${ADMIN_FOLDER}/servers_ui_server`;
export const KEY_ADMIN_SERVERS_TILES_SERVER = `${ADMIN_FOLDER}/servers_tiles_server`;
export const KEY_ADMIN_SERVERS_REFRESH_ERROR = `${ADMIN_FOLDER}/servers_refresh_error`;
export const KEY_ADMIN_SERVERS_ADD_SERVER = `${ADMIN_FOLDER}/servers_add_server`;
export const KEY_ADMIN_SERVERS_SERVER_URL_PLACEHOLDER = `${ADMIN_FOLDER}/servers_server_url_placeholder`;
export const KEY_ADMIN_SERVERS_CONFIRM_URL = `${ADMIN_FOLDER}/servers_confirm_url`;
export const KEY_ADMIN_SERVERS_CANCEL_URL = `${ADMIN_FOLDER}/servers_cancel_url`;
export const KEY_ADMIN_SERVERS_INVALID_URL = `${ADMIN_FOLDER}/servers_invalid_url`;
export const KEY_ADMIN_SERVERS_URL_ACCEPTED = `${ADMIN_FOLDER}/servers_url_accepted`;
export const KEY_ADMIN_SERVERS_MAIN_SERVER_ROLE = `${ADMIN_FOLDER}/servers_main_server_role`;
export const KEY_ADMIN_SERVERS_UNAVAILABLE = `${ADMIN_FOLDER}/servers_unavailable`;
export const KEY_ADMIN_SERVERS_SECONDS = `${ADMIN_FOLDER}/servers_seconds`;
export const KEY_ADMIN_SERVERS_STATUS_READY = `${ADMIN_FOLDER}/servers_status_ready`;
export const KEY_ADMIN_SERVERS_STATUS_STARTING = `${ADMIN_FOLDER}/servers_status_starting`;
export const KEY_ADMIN_SERVERS_STATUS_HEALTHY = `${ADMIN_FOLDER}/servers_status_healthy`;
export const KEY_ADMIN_SERVERS_STATUS_DEGRADED = `${ADMIN_FOLDER}/servers_status_degraded`;
export const KEY_ADMIN_SERVERS_STATUS_STOPPED = `${ADMIN_FOLDER}/servers_status_stopped`;
export const KEY_ADMIN_SERVERS_STATUS_FAILED = `${ADMIN_FOLDER}/servers_status_failed`;
export const KEY_ADMIN_SETTINGS = `${ADMIN_FOLDER}/admin_settings`;
export const KEY_ADMIN_STATUS = `${ADMIN_FOLDER}/admin_status`;
export const KEY_ADMIN_STATUS_REFRESH = `${ADMIN_FOLDER}/admin_status_refresh`;
export const KEY_ADMIN_COMMITS_TITLE = `${ADMIN_FOLDER}/admin_commits`;
export const KEY_ADMIN_LOGS = `${ADMIN_FOLDER}/admin_logs`;
export const KEY_ADMIN_COMMITS_LOADING = `${ADMIN_FOLDER}/admin_commits_loading`;
export const KEY_ADMIN_COMMITS_ERROR = `${ADMIN_FOLDER}/admin_commits_error`;
export const KEY_ADMIN_COMMIT_REPOSITORY = `${ADMIN_FOLDER}/commit_repository`;
export const KEY_ADMIN_COMMIT_HASH = `${ADMIN_FOLDER}/commit_hash`;
export const KEY_ADMIN_COMMIT_DATE = `${ADMIN_FOLDER}/commit_date`;
export const KEY_ADMIN_COMMIT_AUTHOR = `${ADMIN_FOLDER}/commit_author`;
export const KEY_ADMIN_COMMIT_MESSAGE = `${ADMIN_FOLDER}/commit_message`;
export const KEY_ADMIN_COMMIT_FILES = `${ADMIN_FOLDER}/commit_files`;
export const KEY_ADMIN_COMMIT_CREATED = `${ADMIN_FOLDER}/commit_created`;
export const KEY_ADMIN_COMMIT_REMOVED = `${ADMIN_FOLDER}/commit_removed`;
export const KEY_ADMIN_COMMIT_CHANGES = `${ADMIN_FOLDER}/commit_changes`;
export const KEY_ADMIN_COMMIT_INSERTED = `${ADMIN_FOLDER}/commit_inserted`;
export const KEY_ADMIN_COMMIT_DELETED = `${ADMIN_FOLDER}/commit_deleted`;
export const KEY_ADMIN_REPOSITORY_MAIN = `${ADMIN_FOLDER}/repository_main`;
export const KEY_ADMIN_REPOSITORY_ADMIN = `${ADMIN_FOLDER}/repository_admin`;
export const KEY_ADMIN_REPOSITORY_DATA = `${ADMIN_FOLDER}/repository_data`;
export const KEY_ADMIN_REPOSITORY_TILES = `${ADMIN_FOLDER}/repository_tiles`;
export const KEY_ADMIN_REPOSITORY_ASSETS = `${ADMIN_FOLDER}/repository_assets`;
export const KEY_ADMIN_REPOSITORY_UI = `${ADMIN_FOLDER}/repository_ui`;
export const KEY_ADMIN_REPOSITORY_ALL = `${ADMIN_FOLDER}/repository_all`;
export const KEY_ADMIN_REPOSITORY_NONE = `${ADMIN_FOLDER}/repository_none`;
export const KEY_ADMIN_COPY_HASH = `${ADMIN_FOLDER}/copy_full_hash`;
export const KEY_ADMIN_VIEW_GITHUB = `${ADMIN_FOLDER}/view_github`;
export const APP_ADMIN_TEXT = {
  [KEY_ADMIN_SERVERS_AI_SERVER]: "AI server",
  [KEY_ADMIN_REPOSITORY_AI]: "AI",
  [KEY_ADMIN_SERVERS_CLIENTS_TITLE]: "client sessions",
  [KEY_ADMIN_SERVERS_CLIENTS_NOTE]:
    "Unexpired login sessions; this does not indicate which tabs are currently open. Anonymous clients are not tracked.",
  [KEY_ADMIN_SERVERS_CLIENTS_LOADING]: "loading client sessions…",
  [KEY_ADMIN_SERVERS_CLIENTS_EMPTY]: "No authenticated client sessions.",
  [KEY_ADMIN_SERVERS_CLIENTS_ERROR]:
    "Client information is unavailable. Local access requires an administrator session. Protected remote lists must be viewed on that server; credentials are not sent to remote servers. Older servers may need an update.",
  [KEY_ADMIN_SERVERS_CLIENTS_USER]: "user",
  [KEY_ADMIN_SERVERS_CLIENTS_BROWSER]: "browser",
  [KEY_ADMIN_SERVERS_CLIENTS_STARTED]: "session started",
  [KEY_ADMIN_SERVERS_CLIENTS_SEEN]: "last activity",
  [KEY_ADMIN_SERVERS_CLIENTS_EXPIRES]: "expires",
  [KEY_ADMIN_SERVERS_CLIENTS_REFRESH]: "refresh client sessions",
  [KEY_ADMIN_SERVERS_EDIT_ROLE]: "edit role",
  [KEY_ADMIN_SERVERS_SAVE_ROLE]: "save role (leave empty to use the default)",
  [KEY_ADMIN_SERVERS_CANCEL_ROLE]: "cancel role edit",
  [KEY_ADMIN_SERVERS_EDIT_TITLE]: "edit title",
  [KEY_ADMIN_SERVERS_SAVE_TITLE]:
    "save title (leave empty to use the server name)",
  [KEY_ADMIN_SERVERS_CANCEL_TITLE]: "cancel title edit",
  [KEY_REFERENCE_TITLE]: "Reference",
  [KEY_ADMIN_REFERENCE_LOADING]: "loading reference documents...",
  [KEY_ADMIN_REFERENCE_ERROR]: "unable to load reference documents:",
  [KEY_ADMIN_REFERENCE_EMPTY]: "no tracked Markdown documents found",
  [KEY_COMMITS_TITLE]: "Commits",
  [KEY_ADMIN_SOCIAL_TITLE]: "social",
  [KEY_ADMIN_SOCIAL_PAGE_TITLE]: "social media",
  [KEY_ADMIN_SOCIAL_LOADING]: "loading social documents...",
  [KEY_ADMIN_SOCIAL_ERROR]: "unable to load social documents:",
  [KEY_ADMIN_SOCIAL_REFRESH]: "refresh social documents",
  [KEY_ADMIN_SOCIAL_REFRESHING]: "refreshing...",
  [KEY_ADMIN_SOCIAL_LAST_REFRESHED]: "last refreshed",
  [KEY_ADMIN_SOCIAL_STALE]: "snapshot is stale",
  [KEY_ADMIN_SOCIAL_REFRESH_WARNING]: "refresh warning",
  [KEY_ADMIN_OVERVIEW]: "admin overview",
  [KEY_ADMIN_SERVERS]: "servers",
  [KEY_ADMIN_SERVERS_TITLE]: "server awareness",
  [KEY_ADMIN_SERVERS_THIS_SERVER]: "this server",
  [KEY_ADMIN_SERVERS_ROLE_LABEL]: "role",
  [KEY_ADMIN_SERVERS_PUBLIC_ADDRESS_LABEL]: "public address",
  [KEY_ADMIN_SERVERS_HEALTH_LABEL]: "health",
  [KEY_ADMIN_SERVERS_VERSION_LABEL]: "version",
  [KEY_ADMIN_SERVERS_UPTIME_LABEL]: "uptime",
  [KEY_ADMIN_SERVERS_STARTED_LABEL]: "started",
  [KEY_ADMIN_SERVERS_CHECKED_LABEL]: "health checked",
  [KEY_ADMIN_SERVERS_SCOPE_NOTE]:
    "This page describes this Fracto main server. It does not list other Fracto main servers or treat this server's specialized services as separate main servers.",
  [KEY_ADMIN_SERVERS_DEPENDENT_HEALTH_TITLE]: "dependent service health",
  [KEY_ADMIN_SERVERS_HEALTH_REFRESH_NOTE]:
    "Health indicators refresh every five seconds.",
  [KEY_ADMIN_SERVERS_DATA_SERVER]: "data server",
  [KEY_ADMIN_SERVERS_ASSET_SERVER]: "asset server",
  [KEY_ADMIN_SERVERS_ADMIN_SERVER]: "admin server",
  [KEY_ADMIN_SERVERS_UI_SERVER]: "UI server",
  [KEY_ADMIN_SERVERS_TILES_SERVER]: "tiles server",
  [KEY_ADMIN_SERVERS_REFRESH_ERROR]: "Unable to refresh server health:",
  [KEY_ADMIN_SERVERS_ADD_SERVER]: "add server",
  [KEY_ADMIN_SERVERS_SERVER_URL_PLACEHOLDER]: "https://server.example.com",
  [KEY_ADMIN_SERVERS_CONFIRM_URL]: "accept server URL",
  [KEY_ADMIN_SERVERS_CANCEL_URL]: "cancel server URL entry",
  [KEY_ADMIN_SERVERS_INVALID_URL]:
    "Enter a valid server URL beginning with http:// or https://.",
  [KEY_ADMIN_SERVERS_URL_ACCEPTED]: "latest saved URL:",
  [KEY_ADMIN_SERVERS_MAIN_SERVER_ROLE]: "Fracto main server",
  [KEY_ADMIN_SERVERS_UNAVAILABLE]: "unavailable",
  [KEY_ADMIN_SERVERS_SECONDS]: "seconds",
  [KEY_ADMIN_SERVERS_STATUS_READY]: "ready",
  [KEY_ADMIN_SERVERS_STATUS_STARTING]: "starting",
  [KEY_ADMIN_SERVERS_STATUS_HEALTHY]: "healthy",
  [KEY_ADMIN_SERVERS_STATUS_DEGRADED]: "degraded",
  [KEY_ADMIN_SERVERS_STATUS_STOPPED]: "stopped",
  [KEY_ADMIN_SERVERS_STATUS_FAILED]: "failed",
  [KEY_ADMIN_SETTINGS]: "admin settings",
  [KEY_ADMIN_STATUS]: "admin status",
  [KEY_ADMIN_STATUS_REFRESH]: "refresh status",
  [KEY_ADMIN_COMMITS_TITLE]: "version control",
  [KEY_ADMIN_LOGS]: "admin logs",
  [KEY_ADMIN_COMMITS_LOADING]: "loading commits...",
  [KEY_ADMIN_COMMITS_ERROR]: "unable to load commits:",
  [KEY_ADMIN_COMMIT_REPOSITORY]: "repository",
  [KEY_ADMIN_COMMIT_HASH]: "hash",
  [KEY_ADMIN_COMMIT_DATE]: "date",
  [KEY_ADMIN_COMMIT_AUTHOR]: "author",
  [KEY_ADMIN_COMMIT_MESSAGE]: "message",
  [KEY_ADMIN_COMMIT_FILES]: "files",
  [KEY_ADMIN_COMMIT_CREATED]: "created",
  [KEY_ADMIN_COMMIT_REMOVED]: "removed",
  [KEY_ADMIN_COMMIT_CHANGES]: "changes",
  [KEY_ADMIN_COMMIT_INSERTED]: "inserted",
  [KEY_ADMIN_COMMIT_DELETED]: "deleted",
  [KEY_ADMIN_REPOSITORY_MAIN]: "main",
  [KEY_ADMIN_REPOSITORY_ADMIN]: "admin",
  [KEY_ADMIN_REPOSITORY_DATA]: "data",
  [KEY_ADMIN_REPOSITORY_TILES]: "tiles",
  [KEY_ADMIN_REPOSITORY_ASSETS]: "assets",
  [KEY_ADMIN_REPOSITORY_UI]: "UI",
  [KEY_ADMIN_REPOSITORY_ALL]: "all",
  [KEY_ADMIN_REPOSITORY_NONE]: "none",
  [KEY_ADMIN_COPY_HASH]: "copy full hash to clipboard",
  [KEY_ADMIN_VIEW_GITHUB]: "view in GitHub",
  [KEY_ADMIN_ACCOUNTS]: "accounts",
  [KEY_ADMIN_ACCOUNTS_TITLE]: "user accounts",
  [KEY_ADMIN_ACCOUNTS_LOADING]: "loading user accounts...",
  [KEY_ADMIN_ACCOUNTS_ERROR]: "unable to load user accounts:",
  [KEY_ADMIN_ACCOUNTS_EMPTY]: "no user accounts found",
  [KEY_ADMIN_CHAT]: "chat",
  [KEY_ADMIN_CHAT_TITLE]: "fracto AI",
  [KEY_ADMIN_CHAT_MODE]: "Answer mode",
  [KEY_ADMIN_CHAT_GENERAL]: "General chat",
  [KEY_ADMIN_CHAT_REFERENCE]: "App reference",
  [KEY_ADMIN_CHAT_REFERENCE_NOTE]:
    "Ask about the app in up to 512 characters. Answers quote the published app guide with citations; they do not check live state. Each question stands alone. Files are available in General chat.",
  [KEY_ADMIN_CHAT_MODE_NOTE]: "Switching modes starts a new conversation.",
  [KEY_ADMIN_CHAT_STATUS]:
    "Chat uses the local AI server. Access requires an administrator login or the explicit private-lab chat setting. Attached file text is sent with your message; files and conversations are not saved.",
  [KEY_ADMIN_CHAT_EMPTY_TITLE]: "Start a conversation",
  [KEY_ADMIN_CHAT_EMPTY_NOTE]:
    "Ask a question, then follow up. Recent messages provide context; this conversation is cleared when you leave the page.",
  [KEY_ADMIN_CHAT_PLACEHOLDER]: "Write a message to fracto AI...",
  [KEY_ADMIN_CHAT_ATTACH]: "Attach files",
  [KEY_ADMIN_CHAT_REMOVE]: "Remove file",
  [KEY_ADMIN_CHAT_SEND]: "Send",
  [KEY_ADMIN_CHAT_STOP]: "Stop",
  [KEY_ADMIN_CHAT_WORKING]: "Generating response...",
  [KEY_ADMIN_CHAT_ERROR]:
    "The response was interrupted or unavailable. Any text shown may be incomplete. Check your administrator login, message length, and AI server availability, then try again.",
  [KEY_ADMIN_CHAT_RESPONSE_ERRORS]: {
    CHAT_REFERENCE_UNAVAILABLE:
      "App reference is unavailable. An administrator must publish the app guide and enable its reference skill. You can still use General chat.",
    CHAT_REFERENCE_QUESTION:
      "Use a short app question with at most 512 characters and 12 keywords, without files.",
    CHAT_MEMORY_PRESSURE:
      "The AI server cannot start generation because available memory is below its configured reserve. Free memory or adjust the private-lab memory setting before retrying.",
    CHAT_DISK_PRESSURE:
      "The AI server cannot start generation because free disk space is below its configured reserve.",
    CHAT_MODEL_MISSING:
      "The configured local AI model is not installed or available.",
    CHAT_AUTH_REQUIRED:
      "Chat requires an administrator login. This server has not enabled private-lab chat access.",
    CHAT_FORBIDDEN:
      "Chat access was denied. Use the configured UI address and an enabled administrator account, or the explicit private-lab chat setting.",
    CHAT_BUSY:
      "The local AI server is busy. Wait for the current generation to finish, then try again.",
    CHAT_TIMEOUT:
      "The AI response timed out. Any text shown is incomplete; try a shorter request.",
    CHAT_REQUEST_TOO_LARGE:
      "This message exceeds the chat context limit. Shorten it or remove attachments.",
  },
  [KEY_ADMIN_CHAT_FILES_NOTE]:
    "Attach up to 4 UTF-8 TXT, Markdown, JSON or CSV files, 4 KiB each. Message and file text must fit within 8 KiB together. PDF and image support is not available yet.",
  [KEY_ADMIN_CHAT_FILE_ERRORS]: {
    CHAT_REFERENCE_QUESTION:
      "Use a short app question with at most 512 characters, without files.",
    CHAT_FILE_TYPE: "Choose a TXT, Markdown, JSON or CSV file.",
    CHAT_FILE_SIZE:
      "This file exceeds the 4 KiB limit. Use a smaller file or excerpt.",
    CHAT_FILE_COUNT: "Attach no more than four files to a message.",
    CHAT_FILE_NAME: "Use a shorter file name (at most 128 UTF-8 bytes).",
    CHAT_FILE_ENCODING:
      "This file must contain UTF-8 text, without binary data.",
    CHAT_FILE_EMPTY: "This file is empty. Choose a file containing text.",
    CHAT_FILE_JSON:
      "This file contains invalid JSON. Correct it before attaching it.",
    CHAT_FILE_PENDING:
      "Wait for the files to finish reading, or remove the failed attachment.",
    CHAT_REQUEST_TOO_LARGE:
      "The message and file text exceed the 8 KiB context limit. Shorten the message or remove files; nothing has been sent.",
    default:
      "Unable to read this attachment. Check the file format and try again.",
  },
};
