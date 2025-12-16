import {
   TYPE_NUMBER,
   TYPE_STRING
} from "../AppSettings.jsx";
import {DEFAULT_SIDEBAR_WIDTH} from "../constants.jsx";

const DATA_FOLDER = 'data'
export const KEY_DATA_SPLITTER_POS_PX = `${DATA_FOLDER}/splitter_pos_px`
export const KEY_DATA_SECTION = `${DATA_FOLDER}/data_section`

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
}
