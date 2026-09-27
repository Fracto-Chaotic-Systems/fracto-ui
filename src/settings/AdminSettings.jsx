import {
  TYPE_BOOLEAN,
  TYPE_NUMBER,
  TYPE_STRING,
  TYPE_OBJECT,
} from "../AppSettings.jsx";
import { DEFAULT_SIDEBAR_WIDTH } from "../constants.jsx";

const ADMIN_FOLDER = "admin";

export const KEY_ADMIN_SPLITTER_POS_PX = `${ADMIN_FOLDER}/splitter_pos_px`;
export const KEY_ADMIN_SECTION = `${ADMIN_FOLDER}/admin_section`;
export const KEY_ADMIN_LOGS_SHOW_TIMESTAMPS = `${ADMIN_FOLDER}/logs_show_timestamps`;
export const KEY_ADMIN_COMMITS_REPOSITORY_VISIBILITY = `${ADMIN_FOLDER}/commits_repository_visibility`;
export const KEY_ADMIN_SOCIAL_DOCUMENT = `${ADMIN_FOLDER}/social_document`;
export const KEY_ADMIN_SERVERS_SELECTION = `${ADMIN_FOLDER}/servers_selection`;
export const KEY_ADMIN_SERVERS_ADDRESS_BOOK = `${ADMIN_FOLDER}/server_address_book`;
export const KEY_ADMIN_REFERENCE_DOCUMENT = `${ADMIN_FOLDER}/reference_document`;
export const KEY_ADMIN_REFERENCE_SELECTION = `${ADMIN_FOLDER}/reference_selection`;
export const KEY_ADMIN_REFERENCE_EXPANDED_FOLDERS = `${ADMIN_FOLDER}/reference_expanded_folders`;

export const ADMIN_OVERVIEW = "admin_overview";
export const ADMIN_SERVERS = "admin_servers";
export const ADMIN_REFERENCE = "admin_reference";
export const ADMIN_COMMITS = "admin_commits";
export const ADMIN_SOCIAL = "admin_social";
export const ADMIN_SETTINGS = "admin_settings";
export const ADMIN_STATUS = "admin_status";
export const ADMIN_LOGS = "admin_logs";

export const APP_ADMIN_SETTINGS = {
  [KEY_ADMIN_SPLITTER_POS_PX]: {
    data_type: TYPE_NUMBER,
    default_value: DEFAULT_SIDEBAR_WIDTH,
    description: "pixel width of the admin page leftmost splitter",
    persist: true,
  },
  [KEY_ADMIN_SECTION]: {
    data_type: TYPE_STRING,
    default_value: ADMIN_REFERENCE,
    description: "selected section of the admin page",
    persist: true,
  },
  [KEY_ADMIN_LOGS_SHOW_TIMESTAMPS]: {
    data_type: TYPE_BOOLEAN,
    default_value: true,
    description: "show timestamps in admin logs",
    persist: true,
  },
  [KEY_ADMIN_COMMITS_REPOSITORY_VISIBILITY]: {
    data_type: TYPE_OBJECT,
    default_value: {},
    description: "visible repositories on the admin commits page",
    persist: true,
  },
  [KEY_ADMIN_SOCIAL_DOCUMENT]: {
    data_type: TYPE_STRING,
    default_value: "",
    description: "selected document on the admin social page",
    persist: true,
  },
  [KEY_ADMIN_SERVERS_SELECTION]: {
    data_type: TYPE_STRING,
    default_value: "",
    description: "selected item on the admin Servers page",
    persist: true,
  },
  [KEY_ADMIN_SERVERS_ADDRESS_BOOK]: {
    data_type: TYPE_OBJECT,
    default_value: {
      urls: [],
    },
    max_persist_length: 100000,
    description:
      "browser-local list of previously entered server URLs; status is obtained live",
    persist: true,
  },
  [KEY_ADMIN_REFERENCE_DOCUMENT]: {
    data_type: TYPE_STRING,
    default_value: "",
    description: "selected document on the admin Reference page",
    persist: true,
  },
  [KEY_ADMIN_REFERENCE_SELECTION]: {
    data_type: TYPE_STRING,
    default_value: "",
    description: "selected item on the admin Reference page",
    persist: true,
  },
  [KEY_ADMIN_REFERENCE_EXPANDED_FOLDERS]: {
    data_type: TYPE_STRING,
    default_value: "",
    description: "expanded folders on the admin Reference page",
    persist: true,
  },
};
