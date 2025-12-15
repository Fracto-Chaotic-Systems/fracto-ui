import {TYPE_NUMBER} from "./AppSettings.jsx";

const ADMIN_FOLDER = 'admin'
export const KEY_ADMIN_SPLITTER_POS_PX = `${ADMIN_FOLDER}/splitter_pos_px`

export const APP_ADMIN_SETTINGS = {
   [KEY_ADMIN_SPLITTER_POS_PX]: {
      data_type: TYPE_NUMBER,
      default_value: 250,
      description: 'pixel width of the admin page leftmost splitter',
      persist: true,
   },
}
