import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import CoolTable from "../../../utils/ui/CoolTable.jsx";
import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import {
  CELL_ALIGN_CENTER,
  CELL_TYPE_CALLBACK,
  CELL_TYPE_NUMBER,
  TABLE_MULTI_SELECT,
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import { forEach } from "mathjs";
import { bounds_from_short_code } from "../TilesUtils.jsx";
import AppText from "../../../AppText.jsx";
import {
  PAGE_MODE_AUTOMATION,
  PAGE_MODE_MANAGER,
} from "../../utils/PageAutomation.jsx";
import {
  KEY_TILES_GENERATOR_AUTOMATION_ADD,
  KEY_TILES_GENERATOR_AUTOMATION_RUN,
} from "../../../text/TilesText.jsx";
import {
  get_level_colors,
  render_level_color,
} from "../../assets/AssetsUtils.jsx";

const LinkedCell = styled(CoolStyles.InlineBlock)`
  margin: 0;
`;

const COVERAGE_TABLE_COLUMNS = [
  {
    id: "color",
    label: "shade",
    type: CELL_TYPE_CALLBACK,
    width_px: 60,
    align: CELL_ALIGN_CENTER,
  },
  {
    id: "level",
    label: "level",
    type: CELL_TYPE_NUMBER,
    width_px: 40,
    align: CELL_ALIGN_CENTER,
  },
  {
    id: "tile_count",
    label: "tile count",
    type: CELL_TYPE_NUMBER,
    width_px: 80,
    align: CELL_ALIGN_CENTER,
  },
  {
    id: "can_do",
    label: "can do",
    type: CELL_TYPE_NUMBER,
    width_px: 80,
    align: CELL_ALIGN_CENTER,
  },
  {
    id: "blank_tiles",
    label: "blank",
    type: CELL_TYPE_NUMBER,
    width_px: 80,
    align: CELL_ALIGN_CENTER,
  },
  {
    id: "interior_tiles",
    label: "interior",
    type: CELL_TYPE_NUMBER,
    width_px: 80,
    align: CELL_ALIGN_CENTER,
  },
];

export const GENERATOR_CODE_REDO = "tiles_redo";
export const GENERATOR_CODE_CAN_DO = "tiles_can_do";
export const GENERATOR_CODE_BLANK = "tiles_blank";
export const GENERATOR_CODE_INTERIOR = "tiles_interior";

export class GeneratorControl extends Component {
  static propTypes = {
    automation_mode: PropTypes.string.isRequired,
    coverage_data: PropTypes.array.isRequired,
    heat_map_buffer: PropTypes.array,
    selected_levels: PropTypes.array,
    on_coverage_levels_changed: PropTypes.func,
    on_generate: PropTypes.func.isRequired,
  };

  state = {};

  static defaultProps = {
    heat_map_buffer: [],
    selected_levels: [],
    on_coverage_levels_changed: () => {},
  };

  componentDidMount() {}

  componentDidUpdate(prevProps, prevState, snapshot) {}

  generate_redo = (tiles, level) => {
    const { on_generate } = this.props;
    on_generate(tiles, level, GENERATOR_CODE_REDO);
  };

  generate_can_do = (tiles, level) => {
    const { on_generate } = this.props;
    on_generate(tiles, level, GENERATOR_CODE_CAN_DO);
  };

  generate_blank = (tiles, level) => {
    const { on_generate } = this.props;
    on_generate(tiles, level, GENERATOR_CODE_BLANK);
  };

  generate_interior = (tiles, level) => {
    const { on_generate } = this.props;
    on_generate(tiles, level, GENERATOR_CODE_INTERIOR);
  };

  render() {
    const {
      automation_mode,
      coverage_data,
      heat_map_buffer,
      selected_levels,
      on_coverage_levels_changed,
    } = this.props;
    if (!Array.isArray(coverage_data)) {
      // console.log('coverage_data is not an array', coverage_data)
      return [];
    }
    const level_colors = get_level_colors(heat_map_buffer);
    const coverage_rows = coverage_data
      .filter((data, i) => {
        return (
          data.filtered_by_level.length ||
          data.blanks_by_level.length ||
          data.interiors_with_bounds.length ||
          // || data.needs_update_with_bounds.length
          data.tiles.length > 1
        );
      })
      .map((data) => {
        data.can_do = data.filtered_by_level.length ? (
          <LinkedCell
            onClick={(e) =>
              this.generate_can_do(data.filtered_by_level, data.level, false)
            }
          >
            <CoolStyles.LinkSpan>
              {data.filtered_by_level.length}
            </CoolStyles.LinkSpan>
          </LinkedCell>
        ) : (
          "-"
        );
        data.blank_tiles = data.blanks_by_level.length ? (
          <LinkedCell
            onClick={(e) =>
              this.generate_blank(data.blanks_by_level, data.level, false)
            }
          >
            <CoolStyles.LinkSpan>
              {data.blanks_by_level.length}
            </CoolStyles.LinkSpan>
          </LinkedCell>
        ) : (
          "-"
        );
        data.interior_tiles = data.interiors_with_bounds.length ? (
          <LinkedCell
            onClick={(e) =>
              this.generate_interior(
                data.interiors_with_bounds,
                data.level,
                true,
              )
            }
          >
            <CoolStyles.LinkSpan>
              {data.interiors_with_bounds.length}
            </CoolStyles.LinkSpan>
          </LinkedCell>
        ) : (
          "-"
        );
        data.tile_count = data.tiles.length ? (
          <LinkedCell
            onClick={(e) => this.generate_redo(data.tiles, data.level)}
          >
            <CoolStyles.LinkSpan>{data.tiles.length}</CoolStyles.LinkSpan>
          </LinkedCell>
        ) : (
          "-"
        );
        return data;
      });
    if (coverage_rows.length) {
      const last_row = coverage_rows[coverage_rows.length - 1];
      const level = last_row.level + 1;
      console.log("last_row", last_row);
      const extra_tiles = [];
      last_row.filtered_by_level.forEach((tile) => {
        const short_code_0 = `${tile.short_code}0`;
        extra_tiles.push({
          short_code: short_code_0,
          bounds: bounds_from_short_code(short_code_0),
        });
        const short_code_1 = `${tile.short_code}1`;
        extra_tiles.push({
          short_code: short_code_1,
          bounds: bounds_from_short_code(short_code_1),
        });
        const short_code_2 = `${tile.short_code}2`;
        extra_tiles.push({
          short_code: short_code_2,
          bounds: bounds_from_short_code(short_code_2),
        });
        const short_code_3 = `${tile.short_code}3`;
        extra_tiles.push({
          short_code: short_code_3,
          bounds: bounds_from_short_code(short_code_3),
        });
      });
      coverage_rows.push({
        level: level,
        color: [render_level_color, ""],
        tile_count: "-",
        can_do: (
          <LinkedCell onClick={(e) => this.generate_can_do(extra_tiles, level)}>
            <CoolStyles.LinkSpan>
              {last_row.filtered_by_level.length * 4}
            </CoolStyles.LinkSpan>
          </LinkedCell>
        ),
        blank_tiles: "-",
        interior_tiles: "-",
      });
    }

    coverage_rows.forEach((row) => {
      if (row.color === undefined) {
        row.color = [render_level_color, level_colors[row.level] || ""];
      }
    });

    const selected_rows = coverage_rows.reduce(
      (rows, row, index) =>
        selected_levels.includes(row.level) ? [...rows, index] : rows,
      [],
    );
    const levels = coverage_rows.map((row) => row.level);
    const automation_action_key =
      automation_mode === PAGE_MODE_MANAGER
        ? KEY_TILES_GENERATOR_AUTOMATION_ADD
        : automation_mode === PAGE_MODE_AUTOMATION
          ? KEY_TILES_GENERATOR_AUTOMATION_RUN
          : null;
    const automation_action = automation_action_key ? (
      <CoolStyles.InlineBlock
        style={{
          marginLeft: "1rem",
          width: "12rem",
          verticalAlign: "top",
          textAlign: "left",
          fontSize: "1rem",
          lineHeight: "1.5rem",
          fontWeight: "normal",
          color: "#888888",
          letterSpacing: "3px",
          textTransform: "uppercase",
        }}
      >
        {AppText.get(automation_action_key)}
      </CoolStyles.InlineBlock>
    ) : null;
    return (
      <CoolStyles.InlineBlock>
        <CoolStyles.InlineBlock>
          <CoolTable
            data={coverage_rows}
            columns={COVERAGE_TABLE_COLUMNS}
            options={[TABLE_MULTI_SELECT]}
            selected_rows={selected_rows}
            on_select_row={(row) => {
              const level = levels[row];
              const next_levels = selected_levels.includes(level)
                ? selected_levels.filter((item) => item !== level)
                : [...selected_levels, level];
              on_coverage_levels_changed(next_levels);
            }}
            on_select_all={(checked) =>
              on_coverage_levels_changed(checked ? levels : [])
            }
          />
        </CoolStyles.InlineBlock>
        {automation_action}
      </CoolStyles.InlineBlock>
    );
  }
}

export default GeneratorControl;
