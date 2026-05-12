import React, {Component} from "react";

import NavigatorCoverage from "../../navigator/NavigatorCoverage.jsx";
import {VIDEO_GENERATOR_SPLITTER_KEYS} from "../../navigator/NavigatorKeys.jsx";
import {render_coverage_table} from "./AssetsUtils.jsx";
import {CoolStyles} from "../../utils/ui/styles/CoolStyles.jsx";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppSettings from "../../AppSettings.jsx";
import {
   KEY_ASSETS_GENERATOR_FRAME_SETTINGS,
   KEY_ASSETS_GENERATOR_RESOLUTION,
   KEY_ASSETS_SPLITTER_POS_PX
} from "../../settings/AssetsSettings.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../../settings/RootSettings.jsx";

import AppText from "../../AppText.jsx";
import {KEY_ASSETS_VIDEO} from "../../text/AssetsText.jsx";

const UPDATE_INTERVAL_MS = 1000

export class AssetsVideoGenerator extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      frame_settings: {},
      resolution: 0,
      video_outcome: null,
      insert_outcome: null,
      coverage_data: null,
      heat_map_buffer: null,
   }

   componentDidMount() {
      this.setState({
         frame_settings: AppSettings
            .get(KEY_ASSETS_GENERATOR_FRAME_SETTINGS),
         interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
         resolution: AppSettings.get(KEY_ASSETS_GENERATOR_RESOLUTION),
      })
   }

   update_dimensions = () => {
      const {rendered_width, rendered_height} = this.state;
      const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS)
      const splitter_width = AppSettings.get(KEY_ASSETS_SPLITTER_POS_PX)
      const rendered_width_changed = rendered_width !== viewport_dimensions.width - splitter_width
      const rendered_height_changed = rendered_height !== viewport_dimensions.height
      if (rendered_height_changed || rendered_width_changed) {
         this.setState({
            rendered_width: viewport_dimensions.width - splitter_width,
            rendered_height: viewport_dimensions.height,
         })
      }
   }

   control_block = () => {
      const {coverage_data, heat_map_buffer} = this.state
      const coverage_table = render_coverage_table(
         coverage_data, heat_map_buffer)
      return <CoolStyles.InlineBlock>
         {coverage_table}
      </CoolStyles.InlineBlock>
   }

   on_coverage_data = (coverage_data, heat_map_buffer) => {
      this.setState({
         coverage_data,
         heat_map_buffer,
         video_outcome: null,
      })
   }

   operations_block = () => {
      return 'AssetsVideo operations block'
   }

   render() {
      return [
         <styles.SectionTitle
            key={'assets-video-title'}>
            {AppText.get(KEY_ASSETS_VIDEO)}
         </styles.SectionTitle>,
         <NavigatorCoverage
            splitter_keys={VIDEO_GENERATOR_SPLITTER_KEYS}
            control_block={this.control_block()}
            results_block={this.operations_block()}
            on_coverage_data={this.on_coverage_data}
         />
      ];
   }
}

export default AssetsVideoGenerator
