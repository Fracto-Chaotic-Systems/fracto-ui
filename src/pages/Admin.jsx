import React, {Component} from 'react'

import {KEY_ADMIN_SPLITTER_POS_PX} from "../settings/AdminSettings.jsx";
import SplitterLayout from "./SplitterLayout.jsx";

export class Admin extends Component {
   state = {}

   render_left_pane = () => {
      return 'admin left'
   }

   render_right_pane = () => {
      return 'admin right'
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