import {TYPE_NUMBER} from "./AppSettings.jsx";

const ASSETS_FOLDER = 'assets'
export const KEY_ASSETS_SPLITTER_POS_PX = `${ASSETS_FOLDER}/splitter_pos_px`

export const APP_ASSETS_SETTINGS = {
   [KEY_ASSETS_SPLITTER_POS_PX]: {
      data_type: TYPE_NUMBER,
      default_value: 250,
      description: 'pixel width of the assets page leftmost splitter',
      persist: true,
   },
}
