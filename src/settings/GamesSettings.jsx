import {
  TYPE_BOOLEAN,
  TYPE_NUMBER,
  TYPE_STRING,
  TYPE_OBJECT,
} from "../AppSettings.jsx";
import { DEFAULT_SIDEBAR_WIDTH } from "../constants.jsx";

const GAMES_FOLDER = "games";

export const KEY_GAMES_SPLITTER_POS_PX = `${GAMES_FOLDER}/splitter_pos_px`;
export const KEY_GAMES_WORDNET_SPLITTER_POS_PX = `${GAMES_FOLDER}/wordnet_splitter_pos_px`;
export const KEY_GAMES_SECTION = `${GAMES_FOLDER}/games_section`;
export const KEY_GAMES_PLAY_SETTINGS_POSITION = `${GAMES_FOLDER}/play_settings_position`;
export const KEY_GAMES_PLAY_FULL_SCREEN = `${GAMES_FOLDER}/play_full_screen`;
export const KEY_GAMES_PLAY_CONTROLLER = `${GAMES_FOLDER}/play_controller`;
export const KEY_GAMES_PLAY_CONTROLLER_ACTIONS = `${GAMES_FOLDER}/play_controller_actions`;

export const KEY_GAMES_WORLDS_DRAFT_VERSION = `${GAMES_FOLDER}/worlds_draft_version`;
export const KEY_GAMES_WORLD_MAPPING = `${GAMES_FOLDER}/world_mapping`;

export const GAMES_OVERVIEW = "games_overview";
export const GAMES_WORLDS = "games_worlds";
export const GAMES_MUSIC = "games_music";
export const GAMES_PLAY = "games_play";
export const GAMES_WORDNET = "games_wordnet";
export const GAMES_SETTINGS = "games_settings";
export const GAMES_STATUS = "games_status";

export const APP_GAMES_SETTINGS = {
  [KEY_GAMES_PLAY_CONTROLLER_ACTIONS]: {
    data_type: TYPE_BOOLEAN,
    default_value: false,
    description:
      "show descriptive action labels between the on-screen controller halves",
    persist: true,
  },
  [KEY_GAMES_PLAY_CONTROLLER]: {
    data_type: TYPE_STRING,
    default_value: "on_screen",
    description: "selected game controller: on_screen, keyboard, or hand_held",
    persist: true,
  },
  [KEY_GAMES_PLAY_FULL_SCREEN]: {
    data_type: TYPE_BOOLEAN,
    default_value: false,
    description:
      "last confirmed fullscreen state of the game play content area",
    persist: true,
  },
  [KEY_GAMES_PLAY_SETTINGS_POSITION]: {
    data_type: TYPE_NUMBER,
    default_value: 0.7,
    description:
      "settings drawer left-edge fraction of game play content width (0.5–0.95); default 0.7 gives a 30% drawer width",
    persist: true,
  },
  [KEY_GAMES_WORDNET_SPLITTER_POS_PX]: {
    data_type: TYPE_NUMBER,
    default_value: 450,
    description: "pixel width of the WordNet reference tree pane",
    persist: true,
  },
  [KEY_GAMES_WORLDS_DRAFT_VERSION]: {
    data_type: TYPE_STRING,
    default_value: "",
    description: "editorial worlds proposal already applied to the local draft",
    persist: true,
  },
  [KEY_GAMES_WORLD_MAPPING]: {
    data_type: TYPE_OBJECT,
    default_value: {},
    description: "curated orbital cardinality to WordNet synset mapping",
    persist: true,
    max_persist_length: 100000,
  },
  [KEY_GAMES_SPLITTER_POS_PX]: {
    data_type: TYPE_NUMBER,
    default_value: DEFAULT_SIDEBAR_WIDTH,
    description: "pixel width of the games page leftmost splitter",
    persist: true,
  },
  [KEY_GAMES_SECTION]: {
    data_type: TYPE_STRING,
    default_value: GAMES_OVERVIEW,
    description: "selected section of the games page",
    persist: true,
  },
};
