import {TYPE_NUMBER} from "./AppSettings.jsx";

const TILES_FOLDER = 'tiles'
export const KEY_TILES_SPLITTER_POS_PX = `${TILES_FOLDER}/splitter_pos_px`

export const APP_TILES_SETTINGS = {
   [KEY_TILES_SPLITTER_POS_PX]: {
      data_type: TYPE_NUMBER,
      default_value: 250,
      description: 'pixel width of the tiles page leftmost splitter',
      persist: true,
   },
}
