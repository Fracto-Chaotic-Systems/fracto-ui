import { TYPE_NUMBER, TYPE_STRING } from "../AppSettings.jsx";
import { DEFAULT_SIDEBAR_WIDTH } from "../constants.jsx";

const GAMES_FOLDER = "games";

export const KEY_GAMES_SPLITTER_POS_PX = `${GAMES_FOLDER}/splitter_pos_px`;
export const KEY_GAMES_SECTION = `${GAMES_FOLDER}/games_section`;

export const GAMES_OVERVIEW = "games_overview";
export const GAMES_WORDNET = "games_wordnet";
export const GAMES_SETTINGS = "games_settings";
export const GAMES_STATUS = "games_status";

export const APP_GAMES_SETTINGS = {
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
