import {
   TYPE_ARRAY,
   TYPE_NUMBER, TYPE_OBJECT,
   TYPE_STRING
} from "../AppSettings.jsx";
import {DEFAULT_SIDEBAR_WIDTH} from "../constants.jsx";

const STUDY_FOLDER = 'study'
const MAGNITUDES_FOLDER = 'study/magnitudes'
const POINTS_FOLDER = 'study/points'
const MERIDIANS_FOLDER = 'study/meridians'
const FIELDS_FOLDER = 'study/fields'
const MINBROTS_FOLDER = 'study/minibrots'
const NODES_FOLDER = 'study/nodes'
const HYPERPLANE_FOLDER = 'study/hyperplane'
export const KEY_STUDY_SPLITTER_POS_PX = `${STUDY_FOLDER}/splitter_pos_px`
export const KEY_STUDY_SECTION = `${STUDY_FOLDER}/study_section`

export const KEY_STUDY_MAGNITUDES_ASPECT = `${MAGNITUDES_FOLDER}/magnitudes_aspect`
export const KEY_STUDY_MAGNITUDES_CARDINALITY = `${MAGNITUDES_FOLDER}/magnitudes_cardinality`
export const KEY_STUDY_MAGNITUDES_RANGE_MIN = `${MAGNITUDES_FOLDER}/magnitudes_range_min`
export const KEY_STUDY_MAGNITUDES_RANGE_MAX = `${MAGNITUDES_FOLDER}/magnitudes_range_max`
export const KEY_STUDY_MAGNITUDES_INCREMENT = `${MAGNITUDES_FOLDER}/magnitudes_increment`
export const KEY_STUDY_MAGNITUDES_PRECISION = `${MAGNITUDES_FOLDER}/magnitudes_precision`
export const KEY_STUDY_MAGNITUDES_RATIO_ARRAY = `${MAGNITUDES_FOLDER}/ratio_array`

export const KEY_STUDY_POINTS_FRAME_SETTINGS = `${POINTS_FOLDER}/frame_settings`
export const KEY_STUDY_POINTS_SPLITTER_POS = `${POINTS_FOLDER}/splitter_pos`
export const KEY_STUDY_POINTS_LEGEND_SPLITTER_POS = `${POINTS_FOLDER}/legend_splitter_pos`
export const KEY_STUDY_POINTS_STEPS_SPLITTER_POS = `${POINTS_FOLDER}/steps_splitter_pos`

export const KEY_STUDY_MERIDIANS_FRAME_SETTINGS = `${MERIDIANS_FOLDER}/frame_settings`
export const KEY_STUDY_MERIDIANS_SPLITTER_POS = `${MERIDIANS_FOLDER}/splitter_pos`
export const KEY_STUDY_MERIDIANS_LEGEND_SPLITTER_POS = `${MERIDIANS_FOLDER}/legend_splitter_pos`
export const KEY_STUDY_MERIDIANS_STEPS_SPLITTER_POS = `${MERIDIANS_FOLDER}/steps_splitter_pos`

export const KEY_STUDY_FIELDS_FRAME_SETTINGS = `${FIELDS_FOLDER}/frame_settings`
export const KEY_STUDY_FIELDS_SPLITTER_POS = `${FIELDS_FOLDER}/splitter_pos`
export const KEY_STUDY_FIELDS_LEGEND_SPLITTER_POS = `${FIELDS_FOLDER}/legend_splitter_pos`
export const KEY_STUDY_FIELDS_STEPS_SPLITTER_POS = `${FIELDS_FOLDER}/steps_splitter_pos`

export const KEY_STUDY_MINIBROTS_FRAME_SETTINGS = `${MINBROTS_FOLDER}/frame_settings`
export const KEY_STUDY_MINIBROTS_SPLITTER_POS = `${MINBROTS_FOLDER}/splitter_pos`
export const KEY_STUDY_MINIBROTS_LEGEND_SPLITTER_POS = `${MINBROTS_FOLDER}/legend_splitter_pos`
export const KEY_STUDY_MINIBROTS_STEPS_SPLITTER_POS = `${MINBROTS_FOLDER}/steps_splitter_pos`
export const KEY_STUDY_MINIBROTS_SELECTED_ROW = `${MINBROTS_FOLDER}/selected_row`
export const KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS =  `${MINBROTS_FOLDER}/render_splitter_pos`

export const KEY_STUDY_NODES_FRAME_SETTINGS = `${NODES_FOLDER}/frame_settings`
export const KEY_STUDY_NODES_SPLITTER_POS = `${NODES_FOLDER}/splitter_pos`
export const KEY_STUDY_NODES_LEGEND_SPLITTER_POS = `${NODES_FOLDER}/legend_splitter_pos`
export const KEY_STUDY_NODES_STEPS_SPLITTER_POS = `${NODES_FOLDER}/steps_splitter_pos`

export const KEY_STUDY_HYPERPLANE_FRAME_SETTINGS = `${HYPERPLANE_FOLDER}/frame_settings`
export const KEY_STUDY_HYPERPLANE_SPLITTER_POS = `${HYPERPLANE_FOLDER}/splitter_pos`
export const KEY_STUDY_HYPERPLANE_LEGEND_SPLITTER_POS = `${HYPERPLANE_FOLDER}/legend_splitter_pos`
export const KEY_STUDY_HYPERPLANE_STEPS_SPLITTER_POS = `${HYPERPLANE_FOLDER}/steps_splitter_pos`

export const STUDY_OVERVIEW = 'study_overview'
export const STUDY_SETTINGS = 'study_settings'
export const STUDY_STATUS = 'study_status'
export const STUDY_NODES = 'study_nodes'
export const STUDY_INLINE = 'study_inline'
export const STUDY_POINTS = 'study_points'
export const STUDY_FIELDS = 'study_fields'
export const STUDY_MINIBROTS = 'study_minibrots'
export const STUDY_MERIDIANS = 'study_meridians'

const DEFAULT_FRAME_SETTINGS = {
   focal_point: {x: -0.75, y: 0.0001},
   scope: 2.5,
   aspect_ratio: 1.0,
}

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
   [KEY_STUDY_POINTS_FRAME_SETTINGS]: {
      data_type: TYPE_OBJECT,
      default_value: DEFAULT_FRAME_SETTINGS,
      description: 'Frame settings of the study points page',
      persist: true,
   },
   [KEY_STUDY_POINTS_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 500,
      description: 'Current position for the study points splitter',
      persist: true,
   },
   [KEY_STUDY_POINTS_LEGEND_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 800,
      description: 'Current position for the study points horizontal legend splitter',
      persist: true,
   },
   [KEY_STUDY_POINTS_STEPS_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 200,
      description: 'Current position for the study points vertical steps splitter',
      persist: true,
   },
   [KEY_STUDY_FIELDS_FRAME_SETTINGS]: {
      data_type: TYPE_OBJECT,
      default_value: DEFAULT_FRAME_SETTINGS,
      description: 'Frame settings of the study fields page',
      persist: true,
   },
   [KEY_STUDY_FIELDS_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 500,
      description: 'Current position for the study fields splitter',
      persist: true,
   },
   [KEY_STUDY_FIELDS_LEGEND_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 800,
      description: 'Current position for the study fields horizontal legend splitter',
      persist: true,
   },
   [KEY_STUDY_FIELDS_STEPS_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 200,
      description: 'Current position for the study fields vertical steps splitter',
      persist: true,
   },
   [KEY_STUDY_MINIBROTS_FRAME_SETTINGS]: {
      data_type: TYPE_OBJECT,
      default_value: DEFAULT_FRAME_SETTINGS,
      description: 'Frame settings of the study minibrots page',
      persist: true,
   },
   [KEY_STUDY_MINIBROTS_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 500,
      description: 'Current position for the study minibrots splitter',
      persist: true,
   },
   [KEY_STUDY_MINIBROTS_LEGEND_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 800,
      description: 'Current position for the study minibrots horizontal legend splitter',
      persist: true,
   },
   [KEY_STUDY_MINIBROTS_STEPS_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 200,
      description: 'Current position for the study minibrots vertical steps splitter',
      persist: true,
   },
   [KEY_STUDY_MINIBROTS_SELECTED_ROW] :{
      data_type: TYPE_NUMBER,
      default_value: 0,
      description: 'Current selected table row of the minibrot list',
      persist: true,
   },
   [KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 800,
      description: 'Current position for the study minibrots render splitter',
      persist: true,
   },
   [KEY_STUDY_NODES_FRAME_SETTINGS]: {
      data_type: TYPE_OBJECT,
      default_value: DEFAULT_FRAME_SETTINGS,
      description: 'Frame settings of the study nodes page',
      persist: true,
      no_copy: true,
   },
   [KEY_STUDY_NODES_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 500,
      description: 'Current position for the study nodes splitter',
      persist: true,
   },
   [KEY_STUDY_NODES_LEGEND_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 800,
      description: 'Current position for the study nodes horizontal legend splitter',
      persist: true,
   },
   [KEY_STUDY_NODES_STEPS_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 800,
      description: 'Current position for the study nodes vertical steps splitter',
      persist: true,
   },
   [KEY_STUDY_HYPERPLANE_FRAME_SETTINGS]: {
      data_type: TYPE_OBJECT,
      default_value: DEFAULT_FRAME_SETTINGS,
      description: 'Frame settings of the study hyperplane page',
      persist: true,
      no_copy: true,
   },
   [KEY_STUDY_HYPERPLANE_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 500,
      description: 'Current position for the study hyperplane splitter',
      persist: true,
   },
   [KEY_STUDY_HYPERPLANE_LEGEND_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 800,
      description: 'Current position for the study hyperplane horizontal legend splitter',
      persist: true,
   },
   [KEY_STUDY_HYPERPLANE_STEPS_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 800,
      description: 'Current position for the study hyperplane vertical steps splitter',
      persist: true,
   },
   [KEY_STUDY_MERIDIANS_FRAME_SETTINGS]: {
      data_type: TYPE_OBJECT,
      default_value: DEFAULT_FRAME_SETTINGS,
      description: 'Frame settings of the study meridians page',
      persist: true,
   },
   [KEY_STUDY_MERIDIANS_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 500,
      description: 'Current position for the study meridians splitter',
      persist: true,
   },
   [KEY_STUDY_MERIDIANS_LEGEND_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 800,
      description: 'Current position for the study meridians horizontal legend splitter',
      persist: true,
   },
   [KEY_STUDY_MERIDIANS_STEPS_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 200,
      description: 'Current position for the study meridians vertical steps splitter',
      persist: true,
   },
}
