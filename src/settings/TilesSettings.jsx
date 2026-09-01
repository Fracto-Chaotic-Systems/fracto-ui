import {TYPE_BOOLEAN, TYPE_NUMBER, TYPE_OBJECT, TYPE_STRING} from "../AppSettings.jsx";
import {DEFAULT_SIDEBAR_WIDTH} from "../constants.jsx";

const TILES_FOLDER = 'tiles'
const TILES_GENERATOR_FOLDER = 'tiles_generator'
export const KEY_TILES_SPLITTER_POS_PX = `${TILES_FOLDER}/splitter_pos_px`
export const KEY_TILES_SECTION = `${TILES_FOLDER}/tiles_section`
export const KEY_TILES_LOGS_SHOW_TIMESTAMPS = `${TILES_FOLDER}/logs_show_timestamps`
export const KEY_TILES_TEST_COMBINE_RESULTS = `${TILES_FOLDER}/test_combine_results`
export const KEY_TILES_TEST_ANIMATION_FRAME_RATE_FPS = `${TILES_FOLDER}/test_animation_frame_rate_fps`
export const KEY_TILES_TEST_ANIMATION_IMAGE_SIZE_PX = `${TILES_FOLDER}/test_animation_image_size_px`
export const KEY_TILES_GENERATOR_FRAME_SETTINGS = `${TILES_GENERATOR_FOLDER}/frame_settings`
export const KEY_TILES_GENERATOR_SPLITTER_POS = `${TILES_GENERATOR_FOLDER}/splitter_pos`
export const KEY_TILES_GENERATOR_LEGEND_SPLITTER_POS = `${TILES_GENERATOR_FOLDER}/legend_splitter_pos`
export const KEY_TILES_GENERATOR_STEPS_SPLITTER_POS = `${TILES_GENERATOR_FOLDER}/steps_splitter_pos`

export const TILES_OVERVIEW = 'tiles_overview'
export const TILES_SETTINGS = 'tiles_settings'
export const TILES_STATUS = 'tiles_status'
export const TILES_LOGS = 'tiles_logs'
export const TILES_GENERATOR = 'tiles_generator'
export const TILES_INSPECTOR = 'tiles_inspector'
export const TILES_TEST = 'tiles_test'

const DEFAULT_FRAME_SETTINGS = {
   focal_point: {x: -0.75, y: 0.0001},
   scope: 2.5,
   aspect_ratio: 1.0,
}

export const APP_TILES_SETTINGS = {
   [KEY_TILES_SPLITTER_POS_PX]: {
      data_type: TYPE_NUMBER,
      default_value: DEFAULT_SIDEBAR_WIDTH,
      description: 'pixel width of the tiles page leftmost splitter',
      persist: true,
   },
   [KEY_TILES_SECTION]: {
      data_type: TYPE_STRING,
      default_value: TILES_OVERVIEW,
      description: 'selected section of the tiles page',
      persist: true,
   },
   [KEY_TILES_LOGS_SHOW_TIMESTAMPS]: {
      data_type: TYPE_BOOLEAN,
      default_value: true,
      description: 'show timestamps in tile logs',
      persist: true,
   },
   [KEY_TILES_TEST_COMBINE_RESULTS]: {
      data_type: TYPE_BOOLEAN,
      default_value: false,
      description: 'combine benchmark result lines',
      persist: true,
   },
   [KEY_TILES_TEST_ANIMATION_FRAME_RATE_FPS]: {
      data_type: TYPE_NUMBER,
      default_value: 20,
      description: 'animation frame rate in frames per second (fps)',
      persist: true,
   },
   [KEY_TILES_TEST_ANIMATION_IMAGE_SIZE_PX]: {
      data_type: TYPE_NUMBER,
      default_value: 800,
      description: 'animation image width and height in pixels',
      persist: true,
   },
   [KEY_TILES_GENERATOR_FRAME_SETTINGS]: {
      data_type: TYPE_OBJECT,
      default_value: DEFAULT_FRAME_SETTINGS,
      description: 'Frame settings of the tiles generator page',
      persist: true,
   },
   [KEY_TILES_GENERATOR_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 500,
      description: 'Current position for the tiles generator splitter',
      persist: true,
   },
   [KEY_TILES_GENERATOR_LEGEND_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 400,
      description: 'Current position for the horizontal legend splitter',
      persist: true,
   },
   [KEY_TILES_GENERATOR_STEPS_SPLITTER_POS]: {
      data_type: TYPE_NUMBER,
      default_value: 200,
      description: 'Current position for the vertical steps splitter',
      persist: true,
   },
}
