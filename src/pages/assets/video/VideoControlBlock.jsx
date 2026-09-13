import React, { Component } from "react";
import PropTypes from "prop-types";

import {
  get_visible_coverage_levels,
  render_coverage_table,
} from "../AssetsUtils.jsx";
import { TABLE_MULTI_SELECT } from "../../../utils/ui/styles/CoolTableStyles.jsx";

import { CoolStyles } from "../../../utils/ui/styles/CoolStyles.jsx";
import { MainStyles as styles } from "../../../styles/MainStyles.jsx";
import VideoControlButtons from "./VideoControlButtons.jsx";

export class VideoControlBlock extends Component {
  static propTypes = {
    video_script: PropTypes.object,
    coverage_data: PropTypes.object,
    heat_map_buffer: PropTypes.object,
    selected_levels: PropTypes.array,
    on_coverage_levels_changed: PropTypes.func,
    on_control_action: PropTypes.func.isRequired,
  };

  static defaultProps = {
    selected_levels: [],
    on_coverage_levels_changed: () => {},
  };

  render_coverage_table = () => {
    const {
      coverage_data,
      heat_map_buffer,
      selected_levels,
      on_coverage_levels_changed,
    } = this.props;
    const levels = get_visible_coverage_levels(coverage_data, heat_map_buffer);
    const selected_rows = levels.reduce(
      (rows, level, row) =>
        selected_levels.includes(level) ? [...rows, row] : rows,
      [],
    );
    const coverage_table = render_coverage_table(
      coverage_data,
      heat_map_buffer,
      [TABLE_MULTI_SELECT],
      selected_rows,
      (row) => {
        const next_levels = selected_levels.includes(levels[row])
          ? selected_levels.filter((level) => level !== levels[row])
          : [...selected_levels, levels[row]];
        on_coverage_levels_changed(next_levels);
      },
      (checked) =>
        on_coverage_levels_changed(checked ? levels : []),
    );
    return <CoolStyles.InlineBlock>{coverage_table}</CoolStyles.InlineBlock>;
  };

  render() {
    const { on_control_action, video_script, coverage_data, heat_map_buffer } =
      this.props;
    const coverage_table = this.render_coverage_table();
    const control_buttons = (
      <VideoControlButtons
        video_script={video_script}
        coverage_data={coverage_data}
        heat_map_buffer={heat_map_buffer}
        on_control_action={on_control_action}
      />
    );
    return (
      <CoolStyles.InlineBlock>
        {control_buttons}
        {coverage_data ? <styles.HalfRemSpacer /> : ""}
        {coverage_table}
      </CoolStyles.InlineBlock>
    );
  }
}

export default VideoControlBlock;
