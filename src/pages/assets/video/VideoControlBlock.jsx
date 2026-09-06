import React, { Component } from "react";
import PropTypes from "prop-types";

import { render_coverage_table } from "../AssetsUtils.jsx";

import { CoolStyles } from "../../../utils/ui/styles/CoolStyles.jsx";
import { MainStyles as styles } from "../../../styles/MainStyles.jsx";
import VideoControlButtons from "./VideoControlButtons.jsx";

export class VideoControlBlock extends Component {
  static propTypes = {
    video_script: PropTypes.object.isRequired,
    coverage_data: PropTypes.object.isRequired,
    heat_map_buffer: PropTypes.object.isRequired,
    on_control_action: PropTypes.func.isRequired,
  };

  render_coverage_table = () => {
    const { coverage_data, heat_map_buffer } = this.props;
    const coverage_table = render_coverage_table(
      coverage_data,
      heat_map_buffer,
    );
    return <CoolStyles.InlineBlock>{coverage_table}</CoolStyles.InlineBlock>;
  };

  render() {
    const { on_control_action, video_script, coverage_data, heat_map_buffer } =
      this.props;
    const coverage_table = this.render_coverage_table();
    return [
      coverage_table,
      coverage_data ? <styles.HalfRemSpacer /> : "",
      <VideoControlButtons
        video_script={video_script}
        coverage_data={coverage_data}
        heat_map_buffer={heat_map_buffer}
        on_control_action={on_control_action}
      />,
    ];
  }
}

export default VideoControlBlock;
