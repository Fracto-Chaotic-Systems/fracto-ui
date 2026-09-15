import React, { Component } from "react";
import PropTypes from "prop-types";

import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";

/** Renders the video preview area. */
export class VideoMetaPreview extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
    selected_video: PropTypes.object,
    on_video_change: PropTypes.func,
  };

  render() {
    const { width_px, height_px } = this.props;
    return (
      <CoolStyles.Block
        style={{ width: `${width_px}px`, height: `${height_px}px` }}
      >
        {`VideoMetaPreview ${width_px}x${height_px}`}
      </CoolStyles.Block>
    );
  }
}

export default VideoMetaPreview;
