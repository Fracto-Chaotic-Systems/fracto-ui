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
import {CONTROL_ACTION_NEW_VIDEO, CONTROL_ACTION_SAVE_VIDEO} from "./video/VideoControlButtons.jsx";
import VideoOperationsBlock from "./video/VideoOperationsBlock.jsx";

const UPDATE_INTERVAL_MS = 1000
const DEFAULT_VIDEO_RESOLUTION = 1024
const DEFAULT_VIDEO_FPS = 30

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
      video_script: null,
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

   first_step = () => {
      const {frame_settings} = this.state
      return {
         focal_point: frame_settings.focal_point,
         scope: frame_settings.scope,
         frame_count: 1,
      }
   }

   open_video = (data) => {
      console.log('opening video...', data)
   }

   save_video = (data) => {
      console.log('saving video...', data)
   }

   new_video = () => {
      const {video_script} = this.state
      if (video_script) {
         this.save_video(video_script)
      }
      const random_name = `vid_${Math.round(Math.random() * 100000000)}`
      const first_step = this.first_step()
      const new_video_script = {
         asset_id: random_name,
         resolution: DEFAULT_VIDEO_RESOLUTION,
         fps: DEFAULT_VIDEO_FPS,
         steps: [first_step],
      }
      this.setState({video_script: new_video_script})
   }

   on_control_action = (code, data) => {
      console.log("on_control_action", code)
      switch (code) {
         case CONTROL_ACTION_NEW_VIDEO:
            this.new_video()
            break;
         case CONTROL_ACTION_SAVE_VIDEO:
            this.save_video(data)
            break;
         case CONTROL_ACTION_OPEN_VIDEO:
            this.open_video(data)
            break;
         default:
            console.log('on_control_action unknown code', code)
            break;
      }
   }

   on_update_script = (video_script) =>{
      this.setState({video_script})
   }

   render() {
      const {coverage_data, heat_map_buffer, video_script} = this.state
      const control_block = <VideoControlBlock
         video_script={video_script}
         coverage_data={coverage_data}
         heat_map_buffer={heat_map_buffer}
         on_control_action={this.on_control_action}
      />
      const operations_block = <VideoOperationsBlock
         video_script={video_script}
         on_update_script={this.on_update_script}
      />
      return [
         <styles.SectionTitle
            key={'assets-video-title'}>
            {AppText.get(KEY_ASSETS_VIDEO)}
         </styles.SectionTitle>,
         <NavigatorCoverage
            splitter_keys={VIDEO_GENERATOR_SPLITTER_KEYS}
            control_block={[control_block]}
            results_block={[operations_block]}
            on_coverage_data={this.on_coverage_data}
         />
      ];
   }
}

export default AssetsVideoGenerator
