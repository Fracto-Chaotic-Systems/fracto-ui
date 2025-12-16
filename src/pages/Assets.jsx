import React, {Component} from 'react'

import {
   ASSETS_OVERVIEW,
   ASSETS_SETTINGS,
   ASSETS_STATUS,
   KEY_ASSETS_SECTION,
   KEY_ASSETS_SPLITTER_POS_PX
} from "../settings/AssetsSettings.jsx";
import SplitterLayout from "./SplitterLayout.jsx";

import {MainStyles as styles} from '../styles/MainStyles.jsx'
import AppSettings from "../AppSettings.jsx";
import Sidebar, {SIDEBAR_BREAKER} from "./utils/Sidebar.jsx";
import AssetsOverview from "./assets/AssetsOverview.jsx";
import AssetsSettings from "./assets/AssetsSettings.jsx";
import AssetsStatus from "./assets/AssetsStatus.jsx";

const SIDEBAR_LIST = [
   {title: 'overview', section_code: ASSETS_OVERVIEW, right_pane: <AssetsOverview />},
   {title: 'break', section_code: SIDEBAR_BREAKER},
   {title: 'settings', section_code: ASSETS_SETTINGS, right_pane: <AssetsSettings />},
   {title: 'status', section_code: ASSETS_STATUS, right_pane: <AssetsStatus />}
]

export class Assets extends Component {
   state = {section_code: ASSETS_OVERVIEW}

   sidebar_select = (section_code) => {
      AppSettings.on_settings_changed({
         [KEY_ASSETS_SECTION]: section_code
      })
      this.setState({section_code})
   }

   componentDidMount() {
      const section_code = AppSettings.get(KEY_ASSETS_SECTION)
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
         key={'assets-splitter'}
         left_content={left_pane}
         right_content={right_pane}
         splitter_pos_key={KEY_ASSETS_SPLITTER_POS_PX}
      />
   }
}

export default Assets