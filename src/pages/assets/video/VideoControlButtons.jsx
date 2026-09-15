import React, { Component } from "react";
import PropTypes from "prop-types";

import { CoolStyles } from "../../../utils/ui/styles/CoolStyles.jsx";
import { CoolIconButton } from "../../../utils/ui/CoolImports.jsx";
import AppText from "../../../AppText.jsx";
import {
  wand_icon,
  video_open_icon,
  video_save_icon,
  video_undo_icon,
  video_redo_icon,
} from "../../../utils/ui/CoolIcons.jsx";
import {
  KEY_VIDEO_ASSETS_NEW_VIDEO,
  KEY_VIDEO_ASSETS_OPEN_VIDEO,
  KEY_VIDEO_ASSETS_SAVE_VIDEO,
  KEY_VIDEO_ASSETS_UNDO,
  KEY_VIDEO_ASSETS_REDO,
} from "../../../text/AssetsText.jsx";

export const CONTROL_ACTION_NEW_VIDEO = "new_video";
export const CONTROL_ACTION_SAVE_VIDEO = "save_video";
export const CONTROL_ACTION_OPEN_VIDEO = "open_video";
export const CONTROL_ACTION_UNDO = "undo_video";
export const CONTROL_ACTION_REDO = "redo_video";

const BUTTON_SIZE_PX = 35;

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
        disabled={is_undo ? !can_undo : !can_redo}
        style={{ width: BUTTON_SIZE_PX, height: BUTTON_SIZE_PX, margin: "0 2px" }}
      />
    );
  };

  render() {
    const new_video_button = this.render_new_video_button();
    const open_video_button = this.render_open_video_button();
    const save_video_button = this.render_save_video_button();
    const undo_button = this.render_history_button(true);
    const redo_button = this.render_history_button(false);
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
        {undo_button}
        {redo_button}
      </CoolStyles.InlineBlock>
    );
  }
}

export default VideoControlButtons;
