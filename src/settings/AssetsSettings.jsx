import {TYPE_BOOLEAN, TYPE_NUMBER, TYPE_OBJECT, TYPE_STRING} from "../AppSettings.jsx";
import {DEFAULT_SIDEBAR_WIDTH} from "../constants.jsx";

const ASSETS_FOLDER = 'assets'
const ASSETS_GENERATOR_FOLDER = 'assets/generator'
const ASSETS_DETECTOR_FOLDER = 'assets/detector'
const ASSETS_GALLERY_FOLDER = 'assets/gallery'
const VIDEO_GENERATOR_FOLDER = 'assets/video'
const ASSETS_LORE_FOLDER = 'assets/lore'
export const KEY_ASSETS_SPLITTER_POS_PX = `${ASSETS_FOLDER}/splitter_pos_px`
export const KEY_ASSETS_SECTION = `${ASSETS_FOLDER}/assets_section`
export const KEY_ASSETS_LOGS_SHOW_TIMESTAMPS = `${ASSETS_FOLDER}/logs_show_timestamps`
export const KEY_ASSETS_DETECTOR_IS_NODE = `${ASSETS_FOLDER}/detector_is_node`

export const ASSETS_OVERVIEW = 'assets_overview'
export const ASSETS_SETTINGS = 'assets_settings'
export const ASSETS_STATUS = 'assets_status'
export const ASSETS_LOGS = 'assets_logs'
export const ASSETS_GENERATOR = 'assets_generator'
export const VIDEO_GENERATOR = 'video_generator'
export const ASSETS_GALLERY = 'assets_gallery'
export const ASSETS_LORE = 'assets_lore'
export const ASSETS_LORE_STYLES = 'assets_lore_styles'
export const ASSETS_DETECTOR = 'assets_detector'

export const KEY_ASSETS_GENERATOR_FRAME_SETTINGS = `${ASSETS_GENERATOR_FOLDER}/frame_settings`
export const KEY_ASSETS_GENERATOR_SPLITTER_POS = `${ASSETS_GENERATOR_FOLDER}/splitter_pos`
export const KEY_ASSETS_GENERATOR_LEGEND_SPLITTER_POS = `${ASSETS_GENERATOR_FOLDER}/legend_splitter_pos`
export const KEY_ASSETS_GENERATOR_STEPS_SPLITTER_POS = `${ASSETS_GENERATOR_FOLDER}/steps_splitter_pos`
export const KEY_ASSETS_GENERATOR_RESOLUTION = `${ASSETS_GENERATOR_FOLDER}/generator_resolution`

export const KEY_VIDEO_GENERATOR_FRAME_SETTINGS = `${VIDEO_GENERATOR_FOLDER}/frame_settings`
export const KEY_VIDEO_GENERATOR_SPLITTER_POS = `${VIDEO_GENERATOR_FOLDER}/splitter_pos`
export const KEY_VIDEO_GENERATOR_LEGEND_SPLITTER_POS = `${VIDEO_GENERATOR_FOLDER}/legend_splitter_pos`
export const KEY_VIDEO_GENERATOR_STEPS_SPLITTER_POS = `${VIDEO_GENERATOR_FOLDER}/steps_splitter_pos`

export const KEY_ASSETS_DETECTOR_FRAME_SETTINGS = `${ASSETS_DETECTOR_FOLDER}/frame_settings`
export const KEY_ASSETS_DETECTOR_SPLITTER_POS = `${ASSETS_DETECTOR_FOLDER}/splitter_pos`
export const KEY_ASSETS_DETECTOR_LEGEND_SPLITTER_POS = `${ASSETS_DETECTOR_FOLDER}/legend_splitter_pos`
export const KEY_ASSETS_DETECTOR_STEPS_SPLITTER_POS = `${ASSETS_DETECTOR_FOLDER}/steps_splitter_pos`
export const KEY_ASSETS_DETECTOR_RESOLUTION = `${ASSETS_DETECTOR_FOLDER}/generator_resolution`

export const KEY_ASSETS_LIST_SELECTED_ROW = `${ASSETS_GALLERY_FOLDER}/selected_row`
export const KEY_ASSETS_GALLERY_RENDER_SPLITTER_POS = `${ASSETS_GALLERY_FOLDER}/render_splitter_pos_px`
const DEFAULT_FRAME_SETTINGS = {
   focal_point: {x: -0.75, y: 0.0001},
   scope: 2.5,
   aspect_ratio: 1.0,
}

export const KEY_ASSETS_LORE_SELECTED_CATEGORY_ID = `${ASSETS_LORE_FOLDER}/selected_category_id`
export const KEY_ASSETS_LORE_STYLES_OUTERMOST_SPLITTER_POS_PX = `${ASSETS_LORE_FOLDER}/styles_splitter_pos_px`


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
   [KEY_ASSETS_LOGS_SHOW_TIMESTAMPS]: {
      data_type: TYPE_BOOLEAN,
      default_value: true,
      description: 'show timestamps in asset logs',
      persist: true,
   },
   [KEY_ASSETS_GENERATOR_FRAME_SETTINGS]: {
      data_type: TYPE_OBJECT,
      default_value: DEFAULT_FRAME_SETTINGS,
      description: 'Frame settings of the assets generator page',
      persist: true,
   },
   [KEY_ASSETS_GENERATOR_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 500,
      description: 'Current position for the assets generator splitter',
      persist: true,
   },
   [KEY_ASSETS_GENERATOR_LEGEND_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 800,
      description: 'Current position for the horizontal legend splitter',
      persist: true,
   },
   [KEY_ASSETS_GENERATOR_STEPS_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 200,
      description: 'Current position for the vertical steps splitter',
      persist: true,
   },
   [KEY_ASSETS_GENERATOR_RESOLUTION]: {
      data_type: TYPE_NUMBER,
      default_value: 2400,
      description: 'Current resolution of the assets generator',
      persist: true,
   },
   [KEY_ASSETS_LIST_SELECTED_ROW] :{
      data_type: TYPE_NUMBER,
      default_value: 0,
      description: 'Current selected table row of the assets list',
      persist: true,
   },
   [KEY_ASSETS_GALLERY_RENDER_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 800,
      description: 'Current position for the assets gallery render splitter',
      persist: true,
   },
   [KEY_VIDEO_GENERATOR_FRAME_SETTINGS]: {
      data_type: TYPE_OBJECT,
      default_value: DEFAULT_FRAME_SETTINGS,
      description: 'Frame settings of the video generator page',
      persist: true,
   },
   [KEY_VIDEO_GENERATOR_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 500,
      description: 'Current position for the video generator splitter',
      persist: true,
   },
   [KEY_VIDEO_GENERATOR_LEGEND_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 800,
      description: 'Current position for the horizontal video generator legend splitter',
      persist: true,
   },
   [KEY_VIDEO_GENERATOR_STEPS_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 200,
      description: 'Current position for the video generator vertical steps splitter',
      persist: true,
   },
   [KEY_ASSETS_DETECTOR_FRAME_SETTINGS]: {
      data_type: TYPE_OBJECT,
      default_value: DEFAULT_FRAME_SETTINGS,
      description: 'Frame settings of the assets detector page',
      persist: true,
      no_copy: true,
   },
   [KEY_ASSETS_DETECTOR_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 500,
      description: 'Current position for the assets detector splitter',
      persist: true,
   },
   [KEY_ASSETS_DETECTOR_LEGEND_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 800,
      description: 'Current position for the assets detector horizontal legend splitter',
      persist: true,
   },
   [KEY_ASSETS_DETECTOR_STEPS_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 200,
      description: 'Current position for the assets detector vertical steps splitter',
      persist: true,
   },
   [KEY_ASSETS_DETECTOR_IS_NODE]: {
      data_type: TYPE_BOOLEAN,
      default_value: false,
      description: 'Detector queries for nodal vs. freeform bailiwicks',
      persist: true,
   },
   [KEY_ASSETS_LORE_SELECTED_CATEGORY_ID]: {
      data_type: TYPE_NUMBER,
      default_value: 0,
      description: 'The id of the most recently selected category for lore viewing and editing',
      persist: true,
   },
   [KEY_ASSETS_LORE_STYLES_OUTERMOST_SPLITTER_POS_PX]: {
      data_type: TYPE_NUMBER,
      default_value: 0,
      description: 'outermost horizontal splitter position for lore styles',
      persist: true,
   },
}
