import {TYPE_NUMBER} from "./AppSettings.jsx";

const STUDY_FOLDER = 'study'
export const KEY_STUDY_SPLITTER_POS_PX = `${STUDY_FOLDER}/splitter_pos_px`

export const APP_STUDY_SETTINGS = {
   [KEY_STUDY_SPLITTER_POS_PX]: {
      data_type: TYPE_NUMBER,
      default_value: 250,
      description: 'pixel width of the study page leftmost splitter',
      persist: true,
   },
}
