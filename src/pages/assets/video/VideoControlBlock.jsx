import React, {Component} from "react";
import PropTypes from "prop-types";

import {render_coverage_table} from "../AssetsUtils.jsx";

import {CoolStyles} from "../../../utils/ui/styles/CoolStyles.jsx";
import {MainStyles as styles} from '../../../styles/MainStyles.jsx'
import AppText from "../../../AppText.jsx";
import {KEY_VIDEO_ASSETS_NEW_VIDEO} from "../../../text/AssetsText.jsx";

export const CONTROL_ACTION_NEW_VIDEO = 'new_video'

export class VideoControlBlock extends Component {
   static propTypes = {
      steps_list: PropTypes.array.isRequired,
      coverage_data: PropTypes.object.isRequired,
      heat_map_buffer: PropTypes.object.isRequired,
      on_control_action: PropTypes.func.isRequired,
   }

   render_coverage_table = () => {
      const {coverage_data, heat_map_buffer} = this.props
      const coverage_table = render_coverage_table(
         coverage_data, heat_map_buffer)
      return <CoolStyles.InlineBlock>
         {coverage_table}
      </CoolStyles.InlineBlock>
   }

   render_new_video_button = () => {
      const {coverage_data, on_control_action} = this.props
      if (!coverage_data) {
         return []
      }
      return <CoolStyles.InlineBlock
         onClick={() => on_control_action(CONTROL_ACTION_NEW_VIDEO)}
         key={'resolution-select'}>
         <styles.BlueButton
            key={'blue-button'}>
            {AppText.get(KEY_VIDEO_ASSETS_NEW_VIDEO)}
         </styles.BlueButton>
      </CoolStyles.InlineBlock>
   }

   render() {
      const coverage_table = this.render_coverage_table();
      const new_video_button = this.render_new_video_button();
      return [
         coverage_table,
         <styles.HalfRemSpacer />,
         new_video_button,
      ]
   }
}

export default VideoControlBlock
