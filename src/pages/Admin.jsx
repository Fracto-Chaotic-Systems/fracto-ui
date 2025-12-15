import React, {Component} from 'react'

import {CoolSplitter, SPLITTER_TYPE_VERTICAL} from "../ui/CoolSplitter.jsx";
import {HEADER_BAR_HEIGHT_PX} from "../constants.jsx";
import {MainStyles as styles} from '../styles/MainStyles.jsx'
import AppSettings from "../settings/AppSettings.jsx";
import {KEY_ADMIN_SPLITTER_POS_PX} from "../settings/AdminSettings.jsx";
import {copy_json} from "../utils/Dom.js";
import {KEY_VIEWPORT_DIMENSIONS, poll_viewport_dimensions} from "../settings/RootSettings.jsx";

export const SPLITTER_WIDTH_PX = 4;

export class Admin extends Component {
   state = {
      container_ref: React.createRef(),
      container_bounds: {},
      splitter_position: 1,
      viewport_interval: null,
      viewport_dimensions: {width: 0, height: 0},
   }

   componentDidMount() {
      const {container_ref} = this.state
      const container = container_ref.current
      if (container) {
         let container_bounds = container.getBoundingClientRect()
         container_bounds = copy_json(container_bounds)
         container_bounds.top += HEADER_BAR_HEIGHT_PX + 1
         this.setState({container_bounds})
      }
      const viewport_interval = poll_viewport_dimensions(viewport_dimensions => {
         this.setState({
            viewport_dimensions,
            splitter_position: AppSettings.get(KEY_ADMIN_SPLITTER_POS_PX)
         })
      })
      this.setState({viewport_interval})
   }

   componentWillUnmount() {
      const {viewport_interval} = this.state
      if (viewport_interval) {
         clearInterval(viewport_interval)
      }
   }

   resize_panes = (splitter_position) => {
      AppSettings.on_settings_changed({
         [KEY_ADMIN_SPLITTER_POS_PX]: splitter_position
      })
      this.setState({splitter_position})
   }

   render() {
      const {container_ref, container_bounds, splitter_position, viewport_dimensions} = this.state
      const splitter = <CoolSplitter
         type={SPLITTER_TYPE_VERTICAL}
         name={`admin-splitter`}
         bar_width_px={SPLITTER_WIDTH_PX}
         container_bounds={container_bounds}
         position={splitter_position}
         on_change={this.resize_panes}
      />
      const copied_dimensions = copy_json(viewport_dimensions)
      copied_dimensions.height -= HEADER_BAR_HEIGHT_PX
      return <styles.BodyWrapper
         style={copied_dimensions}
         ref={container_ref}>
         {'left_pane'}
         {splitter}
         {'right_pane'}
      </styles.BodyWrapper>
   }
}

export default Admin