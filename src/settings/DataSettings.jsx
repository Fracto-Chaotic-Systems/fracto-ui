import {TYPE_NUMBER} from "./AppSettings.jsx";

const DATA_FOLDER = 'data'
export const KEY_DATA_SPLITTER_POS_PX = `${DATA_FOLDER}/splitter_pos_px`

export const APP_DATA_SETTINGS = {
   [KEY_DATA_SPLITTER_POS_PX]: {
      data_type: TYPE_NUMBER,
      default_value: 250,
      description: 'pixel width of the data page leftmost splitter',
      persist: true,
   },
}
