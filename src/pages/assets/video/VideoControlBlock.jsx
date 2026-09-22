import React, { Component } from "react";
import PropTypes from "prop-types";

import {
  get_visible_coverage_levels,
  render_coverage_table,
} from "../AssetsUtils.jsx";
import {
  TABLE_MULTI_SELECT,
} from "../../../utils/ui/styles/CoolTableStyles.jsx";

import { CoolStyles } from "../../../utils/ui/styles/CoolStyles.jsx";
import { MainStyles as styles } from "../../../styles/MainStyles.jsx";
import VideoControlButtons from "./VideoControlButtons.jsx";
import VideoRecordsTable from "./VideoRecordsTable.jsx";

export class VideoControlBlock extends Component {
  static propTypes = {
    video_script: PropTypes.object,
    coverage_data: PropTypes.object,
    heat_map_buffer: PropTypes.object,
    video_records: PropTypes.array,
    selected_levels: PropTypes.array,
    on_coverage_levels_changed: PropTypes.func,
    on_control_action: PropTypes.func.isRequired,
    on_video_select: PropTypes.func,
    on_close_video_list: PropTypes.func,
    open_table_height_px: PropTypes.number,
    can_undo: PropTypes.bool,
    can_redo: PropTypes.bool,
  };

  static defaultProps = {
    selected_levels: [],
    on_coverage_levels_changed: () => {},
    video_records: null,
    on_video_select: () => {},
    on_close_video_list: () => {},
    open_table_height_px: 0,
    can_undo: false,
    can_redo: false,
  };

  state = {
    selected_video_row: -1,
  };

  componentDidUpdate(prevProps) {
    if (
      prevProps.video_records === null &&
      this.props.video_records !== null &&
      this.state.selected_video_row !== -1
    ) {
      this.setState({ selected_video_row: -1 });
    }
  }

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

  render_video_table = () => {
    const { video_records, on_video_select, on_close_video_list, open_table_height_px } =
      this.props;
    return (
      <VideoRecordsTable
        records={video_records}
        height_px={open_table_height_px}
        on_select={on_video_select}
        on_close={on_close_video_list}
      />
    );
  };

  render() {
    const {
      on_control_action,
      video_script,
      coverage_data,
      heat_map_buffer,
      video_records,
      can_undo,
      can_redo,
    } = this.props;
    const coverage_table =
      video_records === null
        ? this.render_coverage_table()
        : this.render_video_table();
    const control_buttons = (
      <VideoControlButtons
        video_script={video_script}
        coverage_data={coverage_data}
        heat_map_buffer={heat_map_buffer}
        can_undo={can_undo}
        can_redo={can_redo}
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
