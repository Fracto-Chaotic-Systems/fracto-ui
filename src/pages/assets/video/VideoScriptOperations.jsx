import React, { Component } from "react";
import PropTypes from "prop-types";

import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";

/**
 * Operations for editing the video's frame script.
 *
 * The parent owns the splitter geometry and supplies this block with its
 * exact available dimensions so the script editor can remain block-oriented.
 */
export class VideoScriptOperations extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
    selected_video_title: PropTypes.string,
  };

  render() {
    const { width_px, height_px, selected_video_title } = this.props;
    return (
      <CoolStyles.Block
        style={{
          width: `${width_px}px`,
          height: `${height_px}px`,
        }}
      >
        {selected_video_title || `VideoScriptOperations ${width_px}x${height_px}`}
      </CoolStyles.Block>
    );
  }
}

export default VideoScriptOperations;
