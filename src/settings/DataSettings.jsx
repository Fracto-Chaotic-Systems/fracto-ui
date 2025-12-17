import {
   TYPE_NUMBER,
   TYPE_STRING
} from "../AppSettings.jsx";
import {DEFAULT_SIDEBAR_WIDTH} from "../constants.jsx";

const DATA_FOLDER = 'data'
const AUTH_FOLDER = `${DATA_FOLDER}/auth`

export const KEY_DATA_SPLITTER_POS_PX = `${DATA_FOLDER}/splitter_pos_px`
export const KEY_DATA_SECTION = `${DATA_FOLDER}/data_section`
export const KEY_DATA_MYSQL_HOST = `${AUTH_FOLDER}/mysql_host`
export const KEY_DATA_MYSQL_PORT = `${AUTH_FOLDER}/mysql_port`
export const KEY_DATA_MYSQL_USER = `${AUTH_FOLDER}/mysql_user`

export const DATA_OVERVIEW = 'data_overview'
export const DATA_SETTINGS = 'data_settings'
export const DATA_STATUS = 'data_status'

export const APP_DATA_SETTINGS = {
   [KEY_DATA_SPLITTER_POS_PX]: {
      data_type: TYPE_NUMBER,
      default_value: DEFAULT_SIDEBAR_WIDTH,
      description: 'pixel width of the data page leftmost splitter',
      persist: true,
   },
   [KEY_DATA_SECTION]: {
      data_type: TYPE_STRING,
      default_value: DATA_OVERVIEW,
      description: 'selected section of the data page',
      persist: true,
   },
   [KEY_DATA_MYSQL_HOST]: {
      data_type: TYPE_STRING,
      default_value: 'localhost',
      description: 'host name or url of the MySQL database',
      persist: true,
   },
   [KEY_DATA_MYSQL_PORT]: {
      data_type: TYPE_NUMBER,
      default_value: 3306,
      description: 'port of the MySQL database connection',
      persist: true,
   },
   [KEY_DATA_MYSQL_USER]: {
      data_type: TYPE_STRING,
      default_value: 'root',
      description: 'user name for the MySQL database connection',
      persist: true,
   },
}
