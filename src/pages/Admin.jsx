import React, {Component} from 'react'

import {
   ADMIN_OVERVIEW,
   ADMIN_SETTINGS,
   ADMIN_STATUS, KEY_ADMIN_SECTION,
   KEY_ADMIN_SPLITTER_POS_PX
} from "../settings/AdminSettings.jsx";
import SplitterLayout from "./SplitterLayout.jsx";

import {MainStyles as styles} from '../styles/MainStyles.jsx'
import AppSettings from "../settings/AppSettings.jsx";
import Sidebar from "./utils/Sidebar.jsx";

const SIDEBAR_LIST = [
   {title: 'overview', section_code: ADMIN_OVERVIEW},
   {title: 'settings', section_code: ADMIN_SETTINGS},
   {title: 'status', section_code: ADMIN_STATUS}
]

export class Admin extends Component {
   state = {section_code: ADMIN_OVERVIEW}

   sidebar_select = (section_code) => {
      AppSettings.on_settings_changed({
         [KEY_ADMIN_SECTION]: section_code
      })
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
         admin right
      </styles.PaneWrapper>
   }

   render() {
      const left_pane = this.render_left_pane();
      const right_pane = this.render_right_pane();
      return <SplitterLayout
         left_content={left_pane}
         right_content={right_pane}
         splitter_pos_key={KEY_ADMIN_SPLITTER_POS_PX}
      />
   }
}

export default Admin