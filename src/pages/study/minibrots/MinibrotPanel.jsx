import React, {Component} from "react";
import PropTypes from "prop-types";

import CoolSplitter, {
   SPLITTER_TYPE_VERTICAL
} from "../../../utils/ui/CoolSplitter.jsx";
import {SPLITTER_WIDTH_PX} from "../../../constants.jsx";
import FractoRasterImage from "../../../utils/render/FractoRasterImage.jsx";
import FractoOrbitalChart from "../../../utils/render/FractoOrbitalChart.jsx";
import MinibrotList, {
   TABLE_WIDTH_PX
} from "./MinibrotList.jsx";

import {MainStyles as styles} from '../../../styles/MainStyles.jsx'
import AppSettings from "../../../AppSettings.jsx";
import {
   KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS,
   KEY_STUDY_SPLITTER_POS_PX
} from "../../../settings/StudySettings.jsx";

const IMAGE_SIZE_DELTA = 50

export class MinibrotPanel extends Component {
   static propTypes = {
      height_px: PropTypes.number.isRequired,
   }

   state = {
      container_ref: React.createRef(),
      selected_minibrot: {},
      rendered_splitter_pos: 500,
      display_settings: {},
      core_point: {},
      ready: false
   }

   componentDidMount() {
      this.setState({
         rendered_splitter_pos: AppSettings.get(KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS),
      })
   }

   on_select_minibrot = (selected_minibrot) => {
      const display_settings = JSON.parse(selected_minibrot.display_settings)
      const core_point = JSON.parse(selected_minibrot.core_point)
      this.setState({
         selected_minibrot,
         display_settings,
         core_point,
      })
   }

   left_panel = () => {
      const {
         ready,
         core_point,
         container_ref,
         rendered_splitter_pos,
         selected_minibrot,
         display_settings,
      } = this.state
      if (!selected_minibrot.pattern) {
         return []
      }
      if (!display_settings.focal_point) {
         return []
      }
      let top = 0;
      let left = 0;
      let container_bounds = {}
      if (container_ref.current) {
         container_bounds = container_ref.current.getBoundingClientRect()
         top = container_bounds.top
         left = container_bounds.left
      }
      const study_splitter_pos = AppSettings.get(KEY_STUDY_SPLITTER_POS_PX)
      const width = rendered_splitter_pos - study_splitter_pos - TABLE_WIDTH_PX - SPLITTER_WIDTH_PX
      const width_px = Math
         .floor(width / IMAGE_SIZE_DELTA) * IMAGE_SIZE_DELTA
      const margin = (width - width_px) / 2
      const panel_style = {
         top: `${top}px`,
         left: `${left + TABLE_WIDTH_PX}px`,
         width: `${width}px`,
         height: `${container_bounds.height}px`,
         backgroundColor: '#e4e4e4',
      }
      const image_style = {
         margin: `${margin}px auto`,
         width: `${width_px}px`,
         height: `${width_px}px`,
         boxShadow: '5px 5px 10px rgba(0, 0, 0, 0.25)',
         backgroundColor: '#f8f8f8',
         cursor: ready ? 'crosshair' : 'wait',
      }
      // console.log("width_px, display_settings", width_px, display_settings)
      return <styles.FixedInlineBlock
         style={panel_style}>
         <div style={image_style}>
            <FractoRasterImage
               width_px={width_px}
               focal_point={display_settings.focal_point}
               scope={display_settings.scope}
               on_plan_complete={this.on_ready}
            />
         </div>
         <div style={image_style}>
            <FractoOrbitalChart
               width_px={width_px}
               focal_point={core_point}
            />
         </div>
      </styles.FixedInlineBlock>
   }

   right_panel = () => {
      return 'right_panel'
   }

   change_splitter_pos = (pos) => {
      const {container_ref} = this.state
      if (container_ref.current) {
         const container_bounds = container_ref.current.getBoundingClientRect()
         if (pos < (container_bounds.left + TABLE_WIDTH_PX)) {
            return;
         }
         if (pos > (container_bounds.left + TABLE_WIDTH_PX + container_bounds.height / 2)) {
            return;
         }
      }
      AppSettings.on_settings_changed({
         [KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS]: pos
      })
      this.setState({rendered_splitter_pos: pos})
   }

   on_ready = () => {
      this.setState({ready: true})
   }

   render() {
      const {container_ref, rendered_splitter_pos} = this.state
      const {height_px, ready} = this.props
      const table_style = {
         height: `${height_px}px`,
         maxWidth: `${TABLE_WIDTH_PX}px`,
         cursor: ready ? 'pointer' : 'wait',
      }
      const left_panel = this.left_panel()
      const right_panel = this.right_panel()
      const minibrot_table = <MinibrotList
         on_select_minibrot={this.on_select_minibrot}
         height_px={height_px}
         ready={ready}
      />
      const container_bounds = container_ref.current
         ? container_ref.current.getBoundingClientRect()
         : {}
      return <styles.TightCenteredBlock
         ref={container_ref}>
         <styles.ScrollingBlock
            style={table_style}
            key={'input-form'}>
            {minibrot_table}
            {left_panel}
            <CoolSplitter
               type={SPLITTER_TYPE_VERTICAL}
               name={'minibrots-main-splitter'}
               bar_width_px={SPLITTER_WIDTH_PX}
               container_bounds={container_bounds}
               position={rendered_splitter_pos}
               on_change={this.change_splitter_pos}
            />
            {right_panel}
         </styles.ScrollingBlock>
      </styles.TightCenteredBlock>
   }
}

export default MinibrotPanel
