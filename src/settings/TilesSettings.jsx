import {
   TYPE_NUMBER,
   TYPE_STRING
} from "../AppSettings.jsx";
import {DEFAULT_SIDEBAR_WIDTH} from "../constants.jsx";

const TILES_FOLDER = 'tiles'
export const KEY_TILES_SPLITTER_POS_PX = `${TILES_FOLDER}/splitter_pos_px`
export const KEY_TILES_SECTION = `${TILES_FOLDER}/tiles_section`

export const TILES_OVERVIEW = 'tiles_overview'
export const TILES_SETTINGS = 'tiles_settings'
export const TILES_STATUS = 'tiles_status'
export const TILES_LOGS = 'tiles_logs'

export const APP_TILES_SETTINGS = {
   [KEY_TILES_SPLITTER_POS_PX]: {
      data_type: TYPE_NUMBER,
      default_value: DEFAULT_SIDEBAR_WIDTH,
      description: 'pixel width of the tiles page leftmost splitter',
      persist: true,
   },
   [KEY_TILES_SECTION]: {
      data_type: TYPE_STRING,
      default_value: TILES_OVERVIEW,
      description: 'selected section of the tiles page',
      persist: true,
   },
}
