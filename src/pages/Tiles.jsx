import React, {Component} from 'react'

import {
   KEY_TILES_SECTION,
   KEY_TILES_SPLITTER_POS_PX,
   TILES_OVERVIEW,
   TILES_SETTINGS,
   TILES_STATUS
} from "../settings/TilesSettings.jsx";
import SplitterLayout from "./SplitterLayout.jsx";

import {MainStyles as styles} from '../styles/MainStyles.jsx'
import AppSettings from "../settings/AppSettings.jsx";
import Sidebar from "./utils/Sidebar.jsx";

const SIDEBAR_LIST = [
   {title: 'overview', section_code: TILES_OVERVIEW},
   {title: 'settings', section_code: TILES_SETTINGS},
   {title: 'status', section_code: TILES_STATUS}
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
      const sidebar = <Sidebar
         sidebar_list={SIDEBAR_LIST}
         section_code={section_code}
         on_change={this.sidebar_select}
      />
      return <styles.PaneWrapper>
         {sidebar}
      </styles.PaneWrapper>
   }

   render_right_pane = () => {
      return <styles.PaneWrapper>
         tiles right
      </styles.PaneWrapper>
   }


   render() {
      const left_pane = this.render_left_pane();
      const right_pane = this.render_right_pane();
      return <SplitterLayout
         left_content={left_pane}
         right_content={right_pane}
         splitter_pos_key={KEY_TILES_SPLITTER_POS_PX}
      />
   }
}

export default Tiles