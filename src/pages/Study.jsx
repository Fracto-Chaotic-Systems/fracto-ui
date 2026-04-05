import React, {Component} from 'react'

import {MainStyles as styles} from '../styles/MainStyles.jsx'
import AppSettings from "../AppSettings.jsx";
import {
   STUDY_OVERVIEW,
   STUDY_SETTINGS,
   STUDY_STATUS,
   KEY_STUDY_SECTION,
   KEY_STUDY_SPLITTER_POS_PX,
   STUDY_FIELDS,
   STUDY_POINTS,
   STUDY_MAGNITUDES,
   STUDY_MINIBROTS, STUDY_PATHS,
} from "../settings/StudySettings.jsx";
import AppText from "../AppText.jsx";
import {
   KEY_SIDEBAR_OVERVIEW,
   KEY_SIDEBAR_SETTINGS,
   KEY_SIDEBAR_STATUS,
} from "../text/RootText.jsx";
import {
   KEY_FIELDS_TITLE, KEY_HYPERPLANE_TITLE,
   KEY_MAGNITUDES_TITLE,
   KEY_MINIBROTS_TITLE,
   KEY_PATHS_TITLE,
   KEY_POINTS_TITLE, KEY_STUDY_HYPERPLANE,
} from "../text/StudyText.jsx";

import SplitterLayout from "./utils/SplitterLayout.jsx";
import Sidebar, {SIDEBAR_BREAKER} from "./utils/Sidebar.jsx";

import StudyOverview from "./study/StudyOverview.jsx";
import StudySettings from "./study/StudySettings.jsx";
import StudyStatus from "./study/StudyStatus.jsx";
import StudyMagnitudes from "./study/StudyMagnitudes.jsx";
import StudyPoints from "./study/StudyPoints.jsx";
import StudyFields from "./study/StudyFields.jsx";
import StudyMinibrots from "./study/StudyMinibrots.jsx";
import StudyPaths from "./study/StudyPaths.jsx";
import StudyHyperPlane from "./study/StudyHyperPlane.jsx";

const SIDEBAR_LIST = [
   {title_key: KEY_SIDEBAR_OVERVIEW, section_code: STUDY_OVERVIEW, right_pane: <StudyOverview/>},
   {section_code: SIDEBAR_BREAKER},
   {title_key: KEY_PATHS_TITLE, section_code: STUDY_PATHS, right_pane: <StudyPaths/>},
   {title_key: KEY_POINTS_TITLE, section_code: STUDY_POINTS, right_pane: <StudyPoints/>},
   {title_key: KEY_FIELDS_TITLE, section_code: STUDY_FIELDS, right_pane: <StudyFields/>},
   {title_key: KEY_MINIBROTS_TITLE, section_code: STUDY_MINIBROTS, right_pane: <StudyMinibrots/>},
   {title_key: KEY_MAGNITUDES_TITLE, section_code: STUDY_MAGNITUDES, right_pane: <StudyMagnitudes/>},
   {section_code: SIDEBAR_BREAKER},
   {title_key: KEY_HYPERPLANE_TITLE, section_code: KEY_STUDY_HYPERPLANE, right_pane: <StudyHyperPlane/>},
   {section_code: SIDEBAR_BREAKER},
   {title_key: KEY_SIDEBAR_SETTINGS, section_code: STUDY_SETTINGS, right_pane: <StudySettings/>},
   {title_key: KEY_SIDEBAR_STATUS, section_code: STUDY_STATUS, right_pane: <StudyStatus/>}
]

export class Study extends Component {
   state = {section_code: STUDY_OVERVIEW}

   sidebar_select = (section_code) => {
      AppSettings.on_settings_changed({
         [KEY_STUDY_SECTION]: section_code
      })
      this.setState({section_code})
   }

   componentDidMount() {
      const section_code = AppSettings.get(KEY_STUDY_SECTION)
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
         key={'study-splitter'}
         left_content={left_pane}
         right_content={right_pane}
         splitter_pos_key={KEY_STUDY_SPLITTER_POS_PX}
      />
   }
}

export default Study
