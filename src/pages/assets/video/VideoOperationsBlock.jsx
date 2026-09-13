import React, { Component } from "react";
import PropTypes from "prop-types";

import AppText from "../../../AppText.jsx";
import { KEY_VIDEO_ASSETS_OPERATIONS } from "../../../text/AssetsText.jsx";
import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";

export class VideoOperationsBlock extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
    video_script: PropTypes.object,
    on_update_script: PropTypes.func.isRequired,
  };

  render() {
    const { video_script, width_px, height_px } = this.props;
    if (!video_script) {
      return [];
    }
    const panel_style = {
      boxSizing: "border-box",
      width: `${Math.max(0, width_px)}px`,
      height: `${Math.max(0, height_px)}px`,
      border: "1px solid #666666",
      borderRadius: "5px",
      backgroundColor: "white",
      overflow: "auto",
    };
    return (
      <CoolStyles.InlineBlock style={panel_style}>
        {AppText.get(KEY_VIDEO_ASSETS_OPERATIONS)}
      </CoolStyles.InlineBlock>
    );
  }
}

export default VideoOperationsBlock;
