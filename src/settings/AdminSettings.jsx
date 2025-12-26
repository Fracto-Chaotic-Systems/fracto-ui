import {
   TYPE_BOOLEAN,
   TYPE_NUMBER,
   TYPE_STRING
} from "../AppSettings.jsx";
import {DEFAULT_SIDEBAR_WIDTH} from "../constants.jsx";

const ADMIN_FOLDER = 'admin'
const IDENTITY_FOLDER = `${ADMIN_FOLDER}/identity`

export const KEY_ADMIN_SPLITTER_POS_PX = `${ADMIN_FOLDER}/splitter_pos_px`
export const KEY_ADMIN_SECTION = `${ADMIN_FOLDER}/admin_section`

export const KEY_ID_OPERATOR_NAME = `${IDENTITY_FOLDER}/id_operator_name`
export const KEY_ID_OPERATOR_EMAIL = `${IDENTITY_FOLDER}/id_operator_email`
export const KEY_ID_OPERATOR_CONSENT = `${IDENTITY_FOLDER}/id_operator_consent`

export const ADMIN_OVERVIEW = 'admin_overview'
export const ADMIN_IDENTIFY = 'admin_identify'
export const ADMIN_SETTINGS = 'admin_settings'
export const ADMIN_STATUS = 'admin_status'
export const ADMIN_LOGS = 'admin_logs'

export const APP_ADMIN_SETTINGS = {
   [KEY_ADMIN_SPLITTER_POS_PX]: {
      data_type: TYPE_NUMBER,
      default_value: DEFAULT_SIDEBAR_WIDTH,
      description: 'pixel width of the admin page leftmost splitter',
      persist: true,
   },
   [KEY_ADMIN_SECTION]: {
      data_type: TYPE_STRING,
      default_value: ADMIN_IDENTIFY,
      description: 'selected section of the admin page',
      persist: true,
   },
   [KEY_ID_OPERATOR_NAME]: {
      data_type: TYPE_STRING,
      default_value: '',
      description: 'name or handle of the person operating this session',
      persist: true,
   },
   [KEY_ID_OPERATOR_EMAIL]: {
      data_type: TYPE_STRING,
      default_value: '',
      description: 'email address of the person operating this session',
      persist: true,
   },
   [KEY_ID_OPERATOR_CONSENT]: {
      data_type: TYPE_BOOLEAN,
      default_value: false,
      description: 'opt-in to giving the application identifying information',
      persist: true,
   },
}
