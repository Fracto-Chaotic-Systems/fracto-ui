import React, { Component } from "react";
import PropTypes from "prop-types";

import AppText from "../../../AppText.jsx";
import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import { SETTING_LABEL_STYLE } from "../../../utils/ui/styles/SettingStyles.jsx";
import {
  KEY_VIDEO_ASSETS_SETTINGS_FOR_PROJECT,
  KEY_VIDEO_ASSETS_SETTINGS_FOR_STEP,
} from "../../../text/AssetsText.jsx";

const HEADER_HEIGHT_PX = 32;

/** Renders the video project settings area. */
export class VideoMetaSettings extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
    selected_video: PropTypes.object,
    on_video_change: PropTypes.func,
    selected_step_index: PropTypes.number,
  };

  state = {
    target: "project",
  };

  on_target_change = (target) => {
    this.setState({ target });
  };

  render() {
    const { width_px, height_px, selected_step_index = 0 } = this.props;
    const content_height_px = Math.max(0, height_px - HEADER_HEIGHT_PX);
    const step_label = `${AppText.get(KEY_VIDEO_ASSETS_SETTINGS_FOR_STEP)} ${selected_step_index + 1}`;
    return (
      <CoolStyles.Block
        style={{
          width: `${width_px}px`,
          height: `${height_px}px`,
          overflow: "hidden",
        }}
      >
        <CoolStyles.Block
          style={{
            width: `${width_px}px`,
            height: `${HEADER_HEIGHT_PX}px`,
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            paddingLeft: "0.5rem",
            borderBottom: "1px solid #666666",
          }}
        >
          <label style={SETTING_LABEL_STYLE}>
            <input
              type="radio"
              name="video-settings-target"
              checked={this.state.target === "project"}
              onChange={() => this.on_target_change("project")}
            />
            <CoolStyles.InlineBlock
              style={{
                marginLeft: "0.35rem",
                fontWeight: "bold",
                fontStyle: "italic",
              }}
            >
              {AppText.get(KEY_VIDEO_ASSETS_SETTINGS_FOR_PROJECT)}
            </CoolStyles.InlineBlock>
          </label>
          <label style={SETTING_LABEL_STYLE}>
            <input
              type="radio"
              name="video-settings-target"
              checked={this.state.target === "step"}
              onChange={() => this.on_target_change("step")}
            />
            <CoolStyles.InlineBlock
              style={{
                marginLeft: "0.35rem",
                fontWeight: "bold",
                fontStyle: "italic",
              }}
            >
              {step_label}
            </CoolStyles.InlineBlock>
          </label>
        </CoolStyles.Block>
        <CoolStyles.Block
          style={{
            width: `${width_px}px`,
            height: `${content_height_px}px`,
          }}
        />
      </CoolStyles.Block>
    );
  }
}

export default VideoMetaSettings;
