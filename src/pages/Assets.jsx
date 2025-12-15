import React, {Component} from 'react'

import {KEY_ASSETS_SPLITTER_POS_PX} from "../settings/AssetsSettings.jsx";
import SplitterLayout from "./SplitterLayout.jsx";

export class Assets extends Component {
   state = {}

   render_left_pane = () => {
      return 'assets left'
   }

   render_right_pane = () => {
      return 'assets right'
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