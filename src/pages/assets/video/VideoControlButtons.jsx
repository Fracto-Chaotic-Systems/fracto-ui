import React, { Component } from "react";
import PropTypes from "prop-types";

import { CoolStyles } from "../../../utils/ui/styles/CoolStyles.jsx";
import { CoolIconButton } from "../../../utils/ui/CoolImports.jsx";
import AppText from "../../../AppText.jsx";
import {
  wand_icon,
  video_open_icon,
  video_save_icon,
} from "../../../utils/ui/CoolIcons.jsx";
import {
  KEY_VIDEO_ASSETS_NEW_VIDEO,
  KEY_VIDEO_ASSETS_OPEN_VIDEO,
  KEY_VIDEO_ASSETS_SAVE_VIDEO,
} from "../../../text/AssetsText.jsx";

export const CONTROL_ACTION_NEW_VIDEO = "new_video";
export const CONTROL_ACTION_SAVE_VIDEO = "save_video";
export const CONTROL_ACTION_OPEN_VIDEO = "open_video";

const BUTTON_SIZE_PX = 35;

export class VideoControlButtons extends Component {
  static propTypes = {
    video_script: PropTypes.object,
    coverage_data: PropTypes.object,
    heat_map_buffer: PropTypes.object,
    on_control_action: PropTypes.func.isRequired,
  };

  render_new_video_button = () => {
    const { on_control_action } = this.props;
    return (
      <CoolIconButton
        on_click={() => on_control_action(CONTROL_ACTION_NEW_VIDEO)}
        title={AppText.get(KEY_VIDEO_ASSETS_NEW_VIDEO)}
        aria_label={AppText.get(KEY_VIDEO_ASSETS_NEW_VIDEO)}
        content={wand_icon}
        style={{ width: BUTTON_SIZE_PX, height: BUTTON_SIZE_PX, margin: "0 2px" }}
      />
    );
  };

  render_save_video_button = () => {
    const { video_script, on_control_action } = this.props;
    return (
      <CoolIconButton
        on_click={() => on_control_action(CONTROL_ACTION_SAVE_VIDEO)}
        title={AppText.get(KEY_VIDEO_ASSETS_SAVE_VIDEO)}
        aria_label={AppText.get(KEY_VIDEO_ASSETS_SAVE_VIDEO)}
        content={video_save_icon}
        disabled={!video_script}
        style={{ width: BUTTON_SIZE_PX, height: BUTTON_SIZE_PX, margin: "0 2px" }}
      />
    );
  };

  render_open_video_button = () => {
    const { on_control_action } = this.props;
    return (
      <CoolIconButton
        on_click={() => on_control_action(CONTROL_ACTION_OPEN_VIDEO)}
        title={AppText.get(KEY_VIDEO_ASSETS_OPEN_VIDEO)}
        aria_label={AppText.get(KEY_VIDEO_ASSETS_OPEN_VIDEO)}
        content={video_open_icon}
        style={{ width: BUTTON_SIZE_PX, height: BUTTON_SIZE_PX, margin: "0 2px" }}
      />
    );
  };

  render() {
    const new_video_button = this.render_new_video_button();
    const open_video_button = this.render_open_video_button();
    const save_video_button = this.render_save_video_button();
    return (
      <CoolStyles.InlineBlock
        style={{
          display: "flex",
          marginLeft: "0.5rem",
          marginBottom: "0.5rem",
        }}
      >
        {new_video_button}
        {open_video_button}
        {save_video_button}
      </CoolStyles.InlineBlock>
    );
  }
}

export default VideoControlButtons;
