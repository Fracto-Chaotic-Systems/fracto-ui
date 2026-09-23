import React, { Component } from "react";
import PropTypes from "prop-types";

import { CoolStyles } from "../../../utils/ui/styles/CoolStyles.jsx";
import { CoolIconButton } from "../../../utils/ui/CoolImports.jsx";
import AppText from "../../../AppText.jsx";
import {
  video_undo_icon,
  video_redo_icon,
} from "../../../utils/ui/CoolIcons.jsx";
import {
  KEY_VIDEO_ASSETS_UNDO,
  KEY_VIDEO_ASSETS_REDO,
} from "../../../text/AssetsText.jsx";

export const CONTROL_ACTION_UNDO = "undo_video";
export const CONTROL_ACTION_REDO = "redo_video";

const BUTTON_SIZE_PX = 20;

export class VideoControlButtons extends Component {
  static propTypes = {
    video_script: PropTypes.object,
    coverage_data: PropTypes.object,
    heat_map_buffer: PropTypes.object,
    on_control_action: PropTypes.func.isRequired,
    can_undo: PropTypes.bool,
    can_redo: PropTypes.bool,
  };

  static defaultProps = {
    can_undo: false,
    can_redo: false,
  };

  render_history_button = (is_undo) => {
    const { on_control_action, can_undo, can_redo } = this.props;
    const text_key = is_undo ? KEY_VIDEO_ASSETS_UNDO : KEY_VIDEO_ASSETS_REDO;
    return (
      <CoolIconButton
        on_click={() =>
          on_control_action(
            is_undo ? CONTROL_ACTION_UNDO : CONTROL_ACTION_REDO,
          )
        }
        title={AppText.get(text_key)}
        aria_label={AppText.get(text_key)}
        content={is_undo ? video_undo_icon : video_redo_icon}
        icon_style={{ width: "16px", height: "16px" }}
        disabled={is_undo ? !can_undo : !can_redo}
        style={{
          width: BUTTON_SIZE_PX,
          height: BUTTON_SIZE_PX,
          boxSizing: "border-box",
          margin: "0 2px",
        }}
      />
    );
  };

  render() {
    const undo_button = this.render_history_button(true);
    const redo_button = this.render_history_button(false);
    return (
      <CoolStyles.InlineBlock
        style={{
          display: "flex",
          marginLeft: "0.5rem",
        }}
      >
        {undo_button}
        {redo_button}
      </CoolStyles.InlineBlock>
    );
  }
}

export default VideoControlButtons;
