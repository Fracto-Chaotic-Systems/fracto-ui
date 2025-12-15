import React, {Component} from 'react'

import {
   DATA_OVERVIEW,
   DATA_SETTINGS,
   DATA_STATUS,
   KEY_DATA_SECTION,
   KEY_DATA_SPLITTER_POS_PX
} from "../settings/DataSettings.jsx";
import SplitterLayout from "./SplitterLayout.jsx";

import {MainStyles as styles} from '../styles/MainStyles.jsx'
import AppSettings from "../settings/AppSettings.jsx";
import Sidebar from "./utils/Sidebar.jsx";

const SIDEBAR_LIST = [
   {title: 'overview', section_code: DATA_OVERVIEW},
   {title: 'settings', section_code: DATA_SETTINGS},
   {title: 'status', section_code: DATA_STATUS}
]

export class Data extends Component {
   state = {section_code: DATA_OVERVIEW}

   sidebar_select = (section_code) => {
      AppSettings.on_settings_changed({
         [KEY_DATA_SECTION]: section_code
      })
      this.setState({section_code})
   }

   componentDidMount() {
      const section_code = AppSettings.get(KEY_DATA_SECTION)
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
         data right
      </styles.PaneWrapper>
   }

   render() {
      const left_pane = this.render_left_pane();
      const right_pane = this.render_right_pane();
      return <SplitterLayout
         left_content={left_pane}
         right_content={right_pane}
         splitter_pos_key={KEY_DATA_SPLITTER_POS_PX}
      />
   }
}

export default Data