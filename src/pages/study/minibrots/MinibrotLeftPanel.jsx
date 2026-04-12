import React, {Component} from "react";
import PropTypes from "prop-types";

import {MainStyles as styles} from '../../../styles/MainStyles.jsx'
import AppSettings from "../../../AppSettings.jsx";
import {
   KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS,
   KEY_STUDY_SPLITTER_POS_PX
} from "../../../settings/StudySettings.jsx";
import {TABLE_WIDTH_PX} from "./MinibrotList.jsx";
import {SPLITTER_WIDTH_PX} from "../../../constants.jsx";

import FractoRasterImage from "../../../utils/render/FractoRasterImage.jsx";
import FractoOrbitalChart from "../../../utils/render/FractoOrbitalChart.jsx";

const IMAGE_SIZE_DELTA = 50

export class MinibrotLeftPanel extends Component {
   static propTypes = {
      selected_minibrot: PropTypes.object.isRequired,
      container_bounds: PropTypes.object.isRequired,
      ready: PropTypes.bool.isRequired,
   }

   render() {
      const {selected_minibrot, container_bounds, ready} = this.props;
      if (!selected_minibrot.pattern) {
         return []
      }
      const rendered_splitter_pos = AppSettings.get(KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS)
      const core_point = JSON.parse(selected_minibrot.core_point)
      const display_settings = JSON.parse(selected_minibrot.display_settings)
      // console.log('MinibrotLeftPanel, core_point, display_settings', core_point, display_settings)

      const top = container_bounds.top
      const left = container_bounds.left
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
}

export default MinibrotLeftPanel
