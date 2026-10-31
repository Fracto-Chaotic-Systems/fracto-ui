import React, { Component } from "react";

import SplitterLayout from "./utils/SplitterLayout.jsx";
import Sidebar, { SIDEBAR_BREAKER } from "./utils/Sidebar.jsx";

import { MainStyles as styles } from "../styles/MainStyles.jsx";
import AppSettings from "../AppSettings.jsx";
import {
  GAMES_OVERVIEW,
  GAMES_WORDNET,
  GAMES_WORLDS,
  GAMES_SETTINGS,
  GAMES_STATUS,
  KEY_GAMES_SECTION,
  KEY_GAMES_SPLITTER_POS_PX,
} from "../settings/GamesSettings.jsx";

import AppText from "../AppText.jsx";
import {
  KEY_SIDEBAR_OVERVIEW,
  KEY_SIDEBAR_SETTINGS,
  KEY_SIDEBAR_STATUS,
} from "../text/RootText.jsx";

import GamesWordnet from "./games/GamesWordnet.jsx";
import GamesWorlds from "./games/GamesWorlds.jsx";
import { KEY_GAMES_WORDNET, KEY_GAMES_WORLDS } from "../text/GamesText.jsx";

const SIDEBAR_LIST = [
  {
    title_key: KEY_SIDEBAR_OVERVIEW,
    section_code: GAMES_OVERVIEW,
    right_pane: null,
  },
  { section_code: SIDEBAR_BREAKER },
  {
    title_key: KEY_GAMES_WORDNET,
    section_code: GAMES_WORDNET,
    right_pane: <GamesWordnet />,
  },
  { section_code: SIDEBAR_BREAKER },
  {
    title_key: KEY_GAMES_WORLDS,
    section_code: GAMES_WORLDS,
    right_pane: <GamesWorlds />,
  },
  { section_code: SIDEBAR_BREAKER },
  {
    title_key: KEY_SIDEBAR_SETTINGS,
    section_code: GAMES_SETTINGS,
    right_pane: null,
  },
  {
    title_key: KEY_SIDEBAR_STATUS,
    section_code: GAMES_STATUS,
    right_pane: null,
  },
];

export class Games extends Component {
  state = { section_code: GAMES_OVERVIEW };

  sidebar_select = (section_code) => {
    AppSettings.on_settings_changed({
      [KEY_GAMES_SECTION]: section_code,
    });
    this.setState({ section_code });
  };

  componentDidMount() {
    const section_code = AppSettings.get(KEY_GAMES_SECTION);
    this.setState({ section_code });
  }

  render_left_pane = () => {
    const { section_code } = this.state;
    const sidebar_list = SIDEBAR_LIST.map((entry) => {
      if (entry.title_key) {
        entry.title = AppText.get(entry.title_key);
      }
      return entry;
    });
    const sidebar = (
      <Sidebar
        sidebar_list={sidebar_list}
        section_code={section_code}
        on_change={this.sidebar_select}
      />
    );
    return <styles.PaneWrapper>{sidebar}</styles.PaneWrapper>;
  };

  render_right_pane = () => {
    const { section_code } = this.state;
    const section = SIDEBAR_LIST.find(
      (item) => item.section_code === section_code,
    );
    return (
      <styles.PaneWrapper>
        {section ? section.right_pane : ""}
      </styles.PaneWrapper>
    );
  };

  render() {
    const left_pane = this.render_left_pane();
    const right_pane = this.render_right_pane();
    return (
      <SplitterLayout
        key={"Games-splitter"}
        left_content={left_pane}
        right_content={right_pane}
        splitter_pos_key={KEY_GAMES_SPLITTER_POS_PX}
      />
    );
  }
}

export default Games;
