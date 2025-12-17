import React, {Component} from 'react'

import {MainStyles as styles} from '../styles/MainStyles.jsx'
import {
   TILES_OVERVIEW,
   TILES_SETTINGS,
   TILES_STATUS,
   KEY_TILES_SECTION,
   KEY_TILES_SPLITTER_POS_PX
} from "../settings/TilesSettings.jsx";
import {
   KEY_SIDEBAR_OVERVIEW,
   KEY_SIDEBAR_SETTINGS,
   KEY_SIDEBAR_STATUS
} from "../text/RootText.jsx";
import SplitterLayout from "./utils/SplitterLayout.jsx";
import Sidebar, {SIDEBAR_BREAKER} from "./utils/Sidebar.jsx";
import AppSettings from "../AppSettings.jsx";

import TilesOverview from "./tiles/TilesOverview.jsx";
import TilesSettings from "./tiles/TilesSettings.jsx";
import TilesStatus from "./tiles/TilesStatus.jsx";
import AppText from "../AppText.jsx";

const SIDEBAR_LIST = [
   {title_key: KEY_SIDEBAR_OVERVIEW, section_code: TILES_OVERVIEW, right_pane: <TilesOverview/>},
   {section_code: SIDEBAR_BREAKER},
   {section_code: SIDEBAR_BREAKER},
   {title_key: KEY_SIDEBAR_SETTINGS, section_code: TILES_SETTINGS, right_pane: <TilesSettings/>},
   {title_key: KEY_SIDEBAR_STATUS, section_code: TILES_STATUS, right_pane: <TilesStatus/>}
]

export class Tiles extends Component {
   state = {section_code: TILES_OVERVIEW}

   sidebar_select = (section_code) => {
      AppSettings.on_settings_changed({
         [KEY_TILES_SECTION]: section_code
      })
      this.setState({section_code})
   }

   componentDidMount() {
      const section_code = AppSettings.get(KEY_TILES_SECTION)
      this.setState({section_code})
   }

   render_left_pane = () => {
      const {section_code} = this.state
      const sidebar_list = SIDEBAR_LIST.map(entry => {
         if (entry.title_key) {
            entry.title = AppText.get(entry.title_key)
         }
         return entry
      })
      const sidebar = <Sidebar
         sidebar_list={sidebar_list}
         section_code={section_code}
         on_change={this.sidebar_select}
      />
      return <styles.PaneWrapper>
         {sidebar}
      </styles.PaneWrapper>
   }

   render_right_pane = () => {
      const {section_code} = this.state
      const section = SIDEBAR_LIST.find((item) => item.section_code === section_code)
      return <styles.PaneWrapper>
         {section ? section.right_pane : ''}
      </styles.PaneWrapper>
   }

   render() {
      const left_pane = this.render_left_pane();
      const right_pane = this.render_right_pane();
      return <SplitterLayout
         key={'tiles-splitter'}
         left_content={left_pane}
         right_content={right_pane}
         splitter_pos_key={KEY_TILES_SPLITTER_POS_PX}
      />
   }
}

export default Tiles