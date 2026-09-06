import React, { Component } from "react";
import PropTypes from "prop-types";

export class VideoOperationsBlock extends Component {
  static propTypes = {
    video_script: PropTypes.object.isRequired,
    on_update_script: PropTypes.func.isRequired,
  };

  render() {
    const { video_script } = this.props;
    if (!video_script) {
      return [];
    }
    return "VideoOperationsBlock";
  }
}

export default VideoOperationsBlock;
