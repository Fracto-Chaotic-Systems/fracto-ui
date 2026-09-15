import React, { Component } from "react";
import PropTypes from "prop-types";

import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import AppSettings from "../../../AppSettings.jsx";
import { KEY_VIDEO_GENERATOR_FRAME_SETTINGS } from "../../../settings/AssetsSettings.jsx";

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
    selected_video: PropTypes.object.isRequired,
    on_video_change: PropTypes.func.isRequired,
  };

  componentDidMount() {
    this.initialize_first_step();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.selected_video !== this.props.selected_video) {
      this.initialize_first_step();
    }
  }

  initialize_first_step = () => {
    const { selected_video, on_video_change } = this.props;
    if (!selected_video || !on_video_change) {
      return;
    }
    const existing_steps = selected_video.script?.steps;
    if (Array.isArray(existing_steps) && existing_steps.length) {
      return;
    }
    const frame_settings = AppSettings.get(KEY_VIDEO_GENERATOR_FRAME_SETTINGS);
    if (!frame_settings?.focal_point || frame_settings.scope === undefined) {
      return;
    }
    on_video_change({
      script: {
        ...(selected_video.script || {}),
        steps: [
          {
            focal_point: frame_settings.focal_point,
            scope: frame_settings.scope,
          },
        ],
      },
    });
  };

  render() {
    const { width_px, height_px, selected_video } = this.props;
    return (
      <CoolStyles.Block
        style={{
          width: `${width_px}px`,
          height: `${height_px}px`,
        }}
      >
        {selected_video?.title || `VideoScriptOperations ${width_px}x${height_px}`}
      </CoolStyles.Block>
    );
  }
}

export default VideoScriptOperations;
