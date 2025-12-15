import React, {Component} from 'react'

import {KEY_TILES_SPLITTER_POS_PX} from "../settings/TilesSettings.jsx";
import SplitterLayout from "./SplitterLayout.jsx";

import {MainStyles as styles} from '../styles/MainStyles.jsx'

export class Tiles extends Component {
   state = {
      container_ref: React.createRef(),
      container_bounds: {},
      splitter_position: 1,
      viewport_interval: null,
      viewport_dimensions: {width: 0, height: 0},
   }

   render_left_pane = () => {
      return <styles.PaneWrapper>
         tiles left
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