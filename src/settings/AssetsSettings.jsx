import {TYPE_NUMBER, TYPE_STRING} from "../AppSettings.jsx";
import {DEFAULT_SIDEBAR_WIDTH} from "../constants.jsx";

const ASSETS_FOLDER = 'assets'
export const KEY_ASSETS_SPLITTER_POS_PX = `${ASSETS_FOLDER}/splitter_pos_px`
export const KEY_ASSETS_SECTION = `${ASSETS_FOLDER}/assets_section`

export const ASSETS_OVERVIEW = 'assets_overview'
export const ASSETS_SETTINGS = 'assets_settings'
export const ASSETS_STATUS = 'assets_status'

export const APP_ASSETS_SETTINGS = {
   [KEY_ASSETS_SPLITTER_POS_PX]: {
      data_type: TYPE_NUMBER,
      default_value: DEFAULT_SIDEBAR_WIDTH,
      description: 'pixel width of the assets page leftmost splitter',
      persist: true,
   },
   [KEY_ASSETS_SECTION]: {
      data_type: TYPE_STRING,
      default_value: ASSETS_OVERVIEW,
      description: 'selected section of the assets page',
      persist: true,
   },
}
