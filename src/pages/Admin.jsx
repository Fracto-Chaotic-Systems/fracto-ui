import React, {Component} from 'react'

import {
   ADMIN_IDENTIFY,
   ADMIN_OVERVIEW,
   ADMIN_SETTINGS,
   ADMIN_STATUS,
   KEY_ADMIN_SECTION,
   KEY_ADMIN_SPLITTER_POS_PX
} from "../settings/AdminSettings.jsx";
import SplitterLayout from "./SplitterLayout.jsx";

import {MainStyles as styles} from '../styles/MainStyles.jsx'
import AppSettings from "../AppSettings.jsx";
import Sidebar, {SIDEBAR_BREAKER} from "./utils/Sidebar.jsx";

import AdminOverview from "./admin/AdminOverview.jsx";
import AdminSettings from "./admin/AdminSettings.jsx";
import AdminStatus from "./admin/AdminStatus.jsx";
import AdminIdentify from "./admin/AdminIdentify.jsx";

const SIDEBAR_LIST = [
   {title: 'overview', section_code: ADMIN_OVERVIEW, right_pane: <AdminOverview/>},
   {title: 'break', section_code: SIDEBAR_BREAKER},
   {title: 'identify', section_code: ADMIN_IDENTIFY, right_pane: <AdminIdentify/>},
   {title: 'break', section_code: SIDEBAR_BREAKER},
   {title: 'settings', section_code: ADMIN_SETTINGS, right_pane: <AdminSettings/>},
   {title: 'status', section_code: ADMIN_STATUS, right_pane: <AdminStatus/>}
]

export class Admin extends Component {
   state = {section_code: ADMIN_OVERVIEW}

   sidebar_select = (section_code) => {
      AppSettings.on_settings_changed({
         [KEY_ADMIN_SECTION]: section_code
      })
      this.setState({section_code})
   }

   componentDidMount() {
      const interval = setInterval(() => {
         if (!AppSettings.settings_initialized) {
            return
         }
         clearInterval(interval)
         const section_code = AppSettings.get(KEY_ADMIN_SECTION)
         this.setState({section_code})
      }, 500)
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
         left_content={left_pane}
         right_content={right_pane}
         splitter_pos_key={KEY_ADMIN_SPLITTER_POS_PX}
      />
   }
}

export default Admin