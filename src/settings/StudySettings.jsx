import {
   TYPE_ARRAY,
   TYPE_NUMBER,
   TYPE_STRING
} from "../AppSettings.jsx";
import {DEFAULT_SIDEBAR_WIDTH} from "../constants.jsx";

const STUDY_FOLDER = 'study'
const MAGNITUDES_FOLDER = 'study/magnitudes'
export const KEY_STUDY_SPLITTER_POS_PX = `${STUDY_FOLDER}/splitter_pos_px`
export const KEY_STUDY_SECTION = `${STUDY_FOLDER}/study_section`
export const KEY_STUDY_MAGNITUDES_ASPECT = `${MAGNITUDES_FOLDER}/magnitudes_aspect`
export const KEY_STUDY_MAGNITUDES_CARDINALITY = `${MAGNITUDES_FOLDER}/magnitudes_cardinality`
export const KEY_STUDY_MAGNITUDES_RANGE_MIN = `${MAGNITUDES_FOLDER}/magnitudes_range_min`
export const KEY_STUDY_MAGNITUDES_RANGE_MAX = `${MAGNITUDES_FOLDER}/magnitudes_range_max`
export const KEY_STUDY_MAGNITUDES_INCREMENT = `${MAGNITUDES_FOLDER}/magnitudes_increment`
export const KEY_STUDY_MAGNITUDES_PRECISION = `${MAGNITUDES_FOLDER}/magnitudes_precision`
export const KEY_STUDY_MAGNITUDES_RATIO_ARRAY = `${MAGNITUDES_FOLDER}/ratio_array`

export const STUDY_OVERVIEW = 'study_overview'
export const STUDY_SETTINGS = 'study_settings'
export const STUDY_STATUS = 'study_status'

export const APP_STUDY_SETTINGS = {
   [KEY_STUDY_SPLITTER_POS_PX]: {
      data_type: TYPE_NUMBER,
      default_value: DEFAULT_SIDEBAR_WIDTH,
      description: 'pixel width of the study page leftmost splitter',
      persist: true,
   },
   [KEY_STUDY_SECTION]: {
      data_type: TYPE_STRING,
      default_value: STUDY_OVERVIEW,
      description: 'selected section of the study page',
      persist: true,
   },
   [KEY_STUDY_MAGNITUDES_ASPECT]: {
      data_type: TYPE_NUMBER,
      default_value: 1,
      description: 'specified aspect of cardinality, magnitudes study',
      persist: true,
   },
   [KEY_STUDY_MAGNITUDES_CARDINALITY]: {
      data_type: TYPE_NUMBER,
      default_value: 7,
      description: 'specified cardinality, magnitudes study',
      persist: true,
   },
   [KEY_STUDY_MAGNITUDES_RANGE_MIN]: {
      data_type: TYPE_NUMBER,
      default_value: 0.5,
      description: 'specified minimum value of radius, magnitudes study',
      persist: true,
   },
   [KEY_STUDY_MAGNITUDES_RANGE_MAX]: {
      data_type: TYPE_NUMBER,
      default_value: 1.005,
      description: 'specified maximum value of radius, magnitudes study',
      persist: true,
   },
   [KEY_STUDY_MAGNITUDES_INCREMENT]: {
      data_type: TYPE_NUMBER,
      default_value: 0.0001,
      description: 'amount added with each increase in r',
      persist: true,
   },
   [KEY_STUDY_MAGNITUDES_PRECISION]: {
      data_type: TYPE_NUMBER,
      default_value: 24,
      description: 'number of decimal digits of accuracy',
      persist: true,
   },
   [KEY_STUDY_MAGNITUDES_RATIO_ARRAY]: {
      data_type: TYPE_ARRAY,
      default_value: [],
      description: 'list of ratio objects for the study magnitudes page',
      persist: true,
   },
}
