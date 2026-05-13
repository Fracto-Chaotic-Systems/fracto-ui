import React, {Component} from "react";

import NavigatorCoverage from "../../navigator/NavigatorCoverage.jsx";
import {VIDEO_GENERATOR_SPLITTER_KEYS} from "../../navigator/NavigatorKeys.jsx";
import {update_dimensions} from "./AssetsUtils.jsx";
import VideoControlBlock from "./video/VideoControlBlock.jsx";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppSettings from "../../AppSettings.jsx";
import {
   KEY_ASSETS_GENERATOR_FRAME_SETTINGS,
   KEY_ASSETS_GENERATOR_RESOLUTION,
} from "../../settings/AssetsSettings.jsx";
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
      steps_list: null,
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
      const new_values = update_dimensions(rendered_width, rendered_height)
      if (new_values) {
         this.setState(new_values)
      }
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

   on_control_action = (code) => {
      console.log("on_control_action", code)
   }

   render() {
      const {coverage_data, heat_map_buffer, steps_list} = this.state
      const control_block = <VideoControlBlock
         steps_list={steps_list}
         coverage_data={coverage_data}
         heat_map_buffer={heat_map_buffer}
         on_control_action={this.on_control_action}
      />
      return [
         <styles.SectionTitle
            key={'assets-video-title'}>
            {AppText.get(KEY_ASSETS_VIDEO)}
         </styles.SectionTitle>,
         <NavigatorCoverage
            splitter_keys={VIDEO_GENERATOR_SPLITTER_KEYS}
            control_block={[control_block]}
            results_block={this.operations_block()}
            on_coverage_data={this.on_coverage_data}
         />
      ];
   }
}

export default AssetsVideoGenerator
