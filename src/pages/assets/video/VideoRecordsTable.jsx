import React, { Component } from "react";
import PropTypes from "prop-types";

import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import { close_icon } from "../../../utils/ui/CoolIcons.jsx";
import { parse_database_timestamp } from "../../../utils/DatabaseDate.js";
import {
  TABLE_CAN_SELECT,
  CELL_ALIGN_CENTER,
  CELL_ALIGN_LEFT,
  CELL_TYPE_NUMBER,
  CELL_TYPE_TEXT,
  CELL_TYPE_TIME_AGO,
} from "../../../utils/ui/styles/CoolTableStyles.jsx";

/** Reusable selector for persisted video records. */
export class VideoRecordsTable extends Component {
  static propTypes = {
    records: PropTypes.array.isRequired,
    height_px: PropTypes.number,
    on_select: PropTypes.func.isRequired,
    on_close: PropTypes.func,
    selected_id: PropTypes.number,
  };

  static defaultProps = {
    height_px: 0,
    on_close: null,
    selected_id: 0,
  };

  state = { selected_row: -1 };

  componentDidUpdate(prevProps) {
    if (prevProps.selected_id === this.props.selected_id) return;
    const selected_row = this.get_sorted_records().findIndex(
      (record) => Number(record.id) === Number(this.props.selected_id),
    );
    if (selected_row !== this.state.selected_row) {
      this.setState({ selected_row });
    }
  }

  get_video_description = (meta) => {
    if (meta && typeof meta === "object") return meta.description || "";
    if (typeof meta !== "string") return "";
    try {
      return JSON.parse(meta)?.description || "";
    } catch (error) {
      console.error("invalid video metadata", error.message);
      return "";
    }
  };

  get_video_step_count = (script) => {
    if (Array.isArray(script)) return script.length;
    if (typeof script === "string") {
      try {
        return this.get_video_step_count(JSON.parse(script));
      } catch (error) {
        return 0;
      }
    }
    return Array.isArray(script?.steps) ? script.steps.length : 0;
  };

  get_sorted_records = () => {
    const { records } = this.props;
    return [...records].sort(
      (first, second) =>
        parse_database_timestamp(second.updated_at) -
        parse_database_timestamp(first.updated_at),
    );
  };

  render() {
    const { records, height_px, on_select, on_close } = this.props;
    const sorted_records = this.get_sorted_records();
    const table_records = sorted_records.map((record) => ({
      updated: parse_database_timestamp(record.updated_at),
      steps: this.get_video_step_count(record.script),
      description: this.get_video_description(record.meta),
    }));
    return (
      <CoolStyles.InlineBlock
        style={{
          display: "flex",
          alignItems: "flex-start",
          marginLeft: on_close ? "0.5rem" : 0,
        }}
      >
        <CoolStyles.InlineBlock
          style={{
            maxHeight: height_px ? `${height_px}px` : undefined,
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
            data={table_records}
            options={[TABLE_CAN_SELECT]}
            selected_row={this.state.selected_row}
            on_select_row={(row) => {
              this.setState({ selected_row: row });
              on_select(sorted_records[row]);
            }}
            table_style={{
              backgroundColor: "white",
              maxHeight: height_px ? `${height_px}px` : undefined,
            }}
          />
        </CoolStyles.InlineBlock>
        {on_close ? (
          <CoolStyles.InlineBlock
            onClick={on_close}
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
        ) : null}
      </CoolStyles.InlineBlock>
    );
  }
}

export default VideoRecordsTable;
