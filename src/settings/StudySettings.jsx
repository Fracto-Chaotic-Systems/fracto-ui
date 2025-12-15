import {
   TYPE_NUMBER,
   TYPE_STRING
} from "./AppSettings.jsx";

const STUDY_FOLDER = 'study'
export const KEY_STUDY_SPLITTER_POS_PX = `${STUDY_FOLDER}/splitter_pos_px`
export const KEY_STUDY_SECTION = `${STUDY_FOLDER}/study_section`

export const STUDY_OVERVIEW = 'study_overview'
export const STUDY_SETTINGS = 'study_settings'
export const STUDY_STATUS = 'study_status'

export const APP_STUDY_SETTINGS = {
   [KEY_STUDY_SPLITTER_POS_PX]: {
      data_type: TYPE_NUMBER,
      default_value: 250,
      description: 'pixel width of the study page leftmost splitter',
      persist: true,
   },
   [KEY_STUDY_SECTION]: {
      data_type: TYPE_STRING,
      default_value: STUDY_OVERVIEW,
      description: 'selected section of the study page',
      persist: true,
   },
}
