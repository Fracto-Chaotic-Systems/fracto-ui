import React, { Component } from "react";
import PropTypes from "prop-types";

import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";

/** Renders the metadata editing area for a video project. */
export class VideoMetaData extends Component {
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
        {`VideoMetaData ${width_px}x${height_px}`}
      </CoolStyles.Block>
    );
  }
}

export default VideoMetaData;
