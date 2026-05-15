import React, {Component} from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import {CoolStyles} from "../../../utils/ui/styles/CoolStyles.jsx";
import {MainStyles as styles} from '../../../styles/MainStyles.jsx'
import AppText from "../../../AppText.jsx";
import {
   KEY_VIDEO_ASSETS_NEW_VIDEO,
   KEY_VIDEO_ASSETS_OPEN_VIDEO,
   KEY_VIDEO_ASSETS_SAVE_VIDEO
} from "../../../text/AssetsText.jsx";

export const CONTROL_ACTION_NEW_VIDEO = 'new_video'
export const CONTROL_ACTION_SAVE_VIDEO = 'save_video'
export const CONTROL_ACTION_OPEN_VIDEO = 'open_video'

const ButtonGroup = styled(CoolStyles.InlineBlock)`
    text-align: left;
    width: 10rem;
`
const ActionButton = styled(styles.BlueButton)`
    margin-bottom: 0.25rem;
`

export class VideoControlButtons extends Component {
   static propTypes = {
      video_script: PropTypes.object.isRequired,
      coverage_data: PropTypes.object.isRequired,
      heat_map_buffer: PropTypes.object.isRequired,
      on_control_action: PropTypes.func.isRequired,
   }

   render_new_video_button = () => {
      const {coverage_data, on_control_action} = this.props
      if (!coverage_data) {
         return []
      }
      return <CoolStyles.InlineBlock
         onClick={() => on_control_action(CONTROL_ACTION_NEW_VIDEO)}
         key={'new-video-button'}>
         <ActionButton
            key={'blue-button'}>
            {AppText.get(KEY_VIDEO_ASSETS_NEW_VIDEO)}
         </ActionButton>
      </CoolStyles.InlineBlock>
   }

   render_save_video_button = () => {
      const {video_script} = this.props
      if (!video_script) {
         return []
      }
      return <CoolStyles.InlineBlock
         onClick={() => on_control_action(CONTROL_ACTION_SAVE_VIDEO)}
         key={'save-video-button'}>
         <ActionButton
            key={'blue-button'}>
            {AppText.get(KEY_VIDEO_ASSETS_SAVE_VIDEO)}
         </ActionButton>
      </CoolStyles.InlineBlock>
   }

   render_open_video_button = () => {
      const {coverage_data, on_control_action} = this.props
      if (!coverage_data) {
         return []
      }
      return <CoolStyles.InlineBlock
         onClick={() => on_control_action(CONTROL_ACTION_OPEN_VIDEO)}
         key={'open-video-button'}>
         <ActionButton
            key={'blue-button'}>
            {AppText.get(KEY_VIDEO_ASSETS_OPEN_VIDEO)}
         </ActionButton>
      </CoolStyles.InlineBlock>
   }

   render() {
      const new_video_button = this.render_new_video_button();
      const save_video_button = this.render_save_video_button();
      const open_video_button = this.render_open_video_button();
      return <ButtonGroup>
         {open_video_button}
         {new_video_button}
         {save_video_button}
      </ButtonGroup>
   }
}

export default VideoControlButtons
