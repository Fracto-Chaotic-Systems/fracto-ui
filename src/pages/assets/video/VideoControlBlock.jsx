import React, { Component } from "react";
import PropTypes from "prop-types";

import {
  get_visible_coverage_levels,
  render_coverage_table,
} from "../AssetsUtils.jsx";
import {
  TABLE_CAN_SELECT,
  TABLE_MULTI_SELECT,
} from "../../../utils/ui/styles/CoolTableStyles.jsx";

import { CoolStyles } from "../../../utils/ui/styles/CoolStyles.jsx";
import { MainStyles as styles } from "../../../styles/MainStyles.jsx";
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import { close_icon } from "../../../utils/ui/CoolIcons.jsx";
import {
  CELL_ALIGN_CENTER,
  CELL_ALIGN_LEFT,
  CELL_TYPE_NUMBER,
  CELL_TYPE_TEXT,
  CELL_TYPE_TIME_AGO,
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import VideoControlButtons from "./VideoControlButtons.jsx";

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
  };

  static defaultProps = {
    selected_levels: [],
    on_coverage_levels_changed: () => {},
    video_records: null,
    on_video_select: () => {},
    on_close_video_list: () => {},
    open_table_height_px: 0,
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
    const {
      video_records,
      on_video_select,
      on_close_video_list,
      open_table_height_px,
    } = this.props;
    const sorted_video_records = [...video_records].sort(
      (first, second) =>
        this.get_video_timestamp(second.updated_at) -
        this.get_video_timestamp(first.updated_at),
    );
    const records = sorted_video_records
      .map((record) => ({
        updated: this.get_video_timestamp(record.updated_at),
        steps: this.get_video_step_count(record.script),
        description: this.get_video_description(record.meta),
      }));
    return (
      <CoolStyles.InlineBlock
        style={{
          display: "flex",
          alignItems: "flex-start",
          marginLeft: "0.5rem",
          maxHeight: open_table_height_px
            ? `${open_table_height_px}px`
            : undefined,
          overflowY: open_table_height_px ? "auto" : undefined,
        }}
      >
        <CoolTable
          columns={[
            {
              id: "updated",
              label: "updated",
              type: CELL_TYPE_TIME_AGO,
              width_px: 120,
              max_width_px: 120,
              align: CELL_ALIGN_CENTER,
              style: { fontStyle: "italic" },
            },
            {
              id: "steps",
              label: "steps",
              type: CELL_TYPE_NUMBER,
              width_px: 60,
              max_width_px: 60,
              align: CELL_ALIGN_CENTER,
            },
            {
              id: "description",
              label: "description",
              type: CELL_TYPE_TEXT,
              width_px: 240,
              max_width_px: 240,
              align: CELL_ALIGN_LEFT,
            },
          ]}
          data={records}
          options={[TABLE_CAN_SELECT]}
          selected_row={this.state.selected_video_row}
          on_select_row={(row) => {
            this.setState({ selected_video_row: row });
            on_video_select(sorted_video_records[row]);
          }}
          table_style={{ backgroundColor: "white" }}
        />
        <CoolStyles.InlineBlock
          onClick={on_close_video_list}
          title="close"
          role="button"
          aria-label="close"
          style={{
            cursor: "pointer",
            marginLeft: "0.25rem",
            lineHeight: 0,
          }}
        >
          {close_icon}
        </CoolStyles.InlineBlock>
      </CoolStyles.InlineBlock>
    );
  };

  get_video_description = (meta) => {
    if (meta && typeof meta === "object") {
      return meta.description || "";
    }
    if (typeof meta !== "string") {
      return "";
    }
    try {
      return JSON.parse(meta)?.description || "";
    } catch (error) {
      console.error("invalid video metadata", error.message);
      return "";
    }
  };

  get_video_timestamp = (timestamp) => {
    if (!timestamp) {
      return 0;
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (
      typeof timestamp === "string" &&
      !/[zZ]|[+-]\d{2}:?\d{2}$/.test(timestamp)
    ) {
      return new Date(`${timestamp.replace(" ", "T")}Z`);
    }
    return new Date(timestamp);
  };

  get_video_step_count = (script) => {
    if (Array.isArray(script)) {
      return script.length;
    }
    if (typeof script === "string") {
      try {
        return this.get_video_step_count(JSON.parse(script));
      } catch (error) {
        return 0;
      }
    }
    return Array.isArray(script?.steps) ? script.steps.length : 0;
  };

  render() {
    const {
      on_control_action,
      video_script,
      coverage_data,
      heat_map_buffer,
      video_records,
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
