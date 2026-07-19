import React, {Component} from 'react'

import Sidebar, {SIDEBAR_BREAKER} from "./utils/Sidebar.jsx";
import SplitterLayout from "./utils/SplitterLayout.jsx";

import {MainStyles as styles} from '../styles/MainStyles.jsx'
import AppSettings from "../AppSettings.jsx";
import {
   ASSETS_DETECTOR,
   ASSETS_GALLERY,
   ASSETS_GENERATOR,
   ASSETS_LOGS, ASSETS_LORE,
   ASSETS_OVERVIEW,
   ASSETS_SETTINGS,
   ASSETS_STATUS,
   KEY_ASSETS_SECTION,
   KEY_ASSETS_SPLITTER_POS_PX,
   VIDEO_GENERATOR
} from "../settings/AssetsSettings.jsx";
import AppText from "../AppText.jsx";
import {
   KEY_SIDEBAR_LOGS,
   KEY_SIDEBAR_OVERVIEW,
   KEY_SIDEBAR_SETTINGS,
   KEY_SIDEBAR_STATUS
} from "../text/RootText.jsx";
import {
   KEY_ASSETS_DETECTOR_SIDEBAR,
   KEY_ASSETS_GALLERY_SIDEBAR,
   KEY_ASSETS_LORE_SIDEBAR,
   KEY_IMAGE_ASSETS_GENERATOR,
   KEY_VIDEO_ASSETS_GENERATOR
} from "../text/AssetsText.jsx";

import AssetsOverview from "./assets/AssetsOverview.jsx";
import AssetsSettings from "./assets/AssetsSettings.jsx";
import AssetsStatus from "./assets/AssetsStatus.jsx";
import AssetsLogs from "./assets/AssetsLogs.jsx";
import AssetsImageGenerator from "./assets/AssetsImageGenerator.jsx";
import AssetsImageGallery from "./assets/AssetsImageGallery.jsx";
import AssetsVideoGenerator from "./assets/AssetsVideoGenerator.jsx";
import AssetsLore from "./assets/AssetsLore.jsx";
import AssetsDetector from "./assets/AssetsDetector.jsx";

const SIDEBAR_LIST = [
   {title_key: KEY_SIDEBAR_OVERVIEW, section_code: ASSETS_OVERVIEW, right_pane: <AssetsOverview/>},
   {section_code: SIDEBAR_BREAKER},
   {title_key: KEY_VIDEO_ASSETS_GENERATOR, section_code: VIDEO_GENERATOR, right_pane: <AssetsVideoGenerator/>},
   {title_key: KEY_IMAGE_ASSETS_GENERATOR, section_code: ASSETS_GENERATOR, right_pane: <AssetsImageGenerator/>},
   {title_key: KEY_ASSETS_GALLERY_SIDEBAR, section_code: ASSETS_GALLERY, right_pane: <AssetsImageGallery/>},
   {title_key: KEY_ASSETS_DETECTOR_SIDEBAR, section_code: ASSETS_DETECTOR, right_pane: <AssetsDetector/>},
   {title_key: KEY_ASSETS_LORE_SIDEBAR, section_code: ASSETS_LORE, right_pane: <AssetsLore/>},
   {section_code: SIDEBAR_BREAKER},
   {title_key: KEY_SIDEBAR_SETTINGS, section_code: ASSETS_SETTINGS, right_pane: <AssetsSettings/>},
   {title_key: KEY_SIDEBAR_STATUS, section_code: ASSETS_STATUS, right_pane: <AssetsStatus/>},
   {title_key: KEY_SIDEBAR_LOGS, section_code: ASSETS_LOGS, right_pane: <AssetsLogs/>},
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
         key={'assets-splitter'}
         left_content={left_pane}
         right_content={right_pane}
         splitter_pos_key={KEY_ASSETS_SPLITTER_POS_PX}
      />
   }
}

export default Assets