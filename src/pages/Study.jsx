import React, {Component} from 'react'

import {KEY_STUDY_SPLITTER_POS_PX} from "../settings/StudySettings.jsx";
import SplitterLayout from "./SplitterLayout.jsx";

export class Study extends Component {
   state = {
      container_ref: React.createRef(),
      container_bounds: {},
      splitter_position: 1,
      viewport_interval: null,
      viewport_dimensions: {width: 0, height: 0},
   }

   render_left_pane = () => {
      return 'study left'
   }

   render_right_pane = () => {
      return 'study right'
   }

   render() {
      const left_pane = this.render_left_pane();
      const right_pane = this.render_right_pane();
      return <SplitterLayout
         left_content={left_pane}
         right_content={right_pane}
         splitter_pos_key={KEY_STUDY_SPLITTER_POS_PX}
      />
   }
}

export default Study