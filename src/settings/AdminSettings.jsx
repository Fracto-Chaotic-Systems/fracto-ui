import {
   TYPE_NUMBER,
   TYPE_STRING
} from "./AppSettings.jsx";

const ADMIN_FOLDER = 'admin'
export const KEY_ADMIN_SPLITTER_POS_PX = `${ADMIN_FOLDER}/splitter_pos_px`
export const KEY_ADMIN_SECTION = `${ADMIN_FOLDER}/admin_section`

export const ADMIN_OVERVIEW = 'admin_overview'
export const ADMIN_SETTINGS = 'admin_settings'
export const ADMIN_STATUS = 'admin_status'

export const APP_ADMIN_SETTINGS = {
   [KEY_ADMIN_SPLITTER_POS_PX]: {
      data_type: TYPE_NUMBER,
      default_value: 250,
      description: 'pixel width of the admin page leftmost splitter',
      persist: true,
   },
   [KEY_ADMIN_SECTION]: {
      data_type: TYPE_STRING,
      default_value: ADMIN_OVERVIEW,
      description: 'selected section of the admin page',
      persist: true,
   },
}
