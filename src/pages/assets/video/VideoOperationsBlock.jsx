import React, { Component } from "react";
import PropTypes from "prop-types";

import AppText from "../../../AppText.jsx";
import { KEY_VIDEO_ASSETS_OPERATIONS } from "../../../text/AssetsText.jsx";

export class VideoOperationsBlock extends Component {
  static propTypes = {
    video_script: PropTypes.object,
    on_update_script: PropTypes.func.isRequired,
  };

  render() {
    const { video_script } = this.props;
    if (!video_script) {
      return [];
    }
    return AppText.get(KEY_VIDEO_ASSETS_OPERATIONS);
  }
}

export default VideoOperationsBlock;
