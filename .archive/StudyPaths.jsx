import React, { Component } from "react";

import CoolTable from "../src/utils/ui/CoolTable.jsx";
import NavigatorSplitterLayout from "../src/navigator/NavigatorSplitterLayout.jsx";
import {
  highlight_canvas,
  identify_cores,
} from "../src/pages/study/StudyUtils.jsx";

import { MainStyles as styles, MARGIN_PX } from "../src/styles/MainStyles.jsx";
import {
  CELL_ALIGN_CENTER,
  CELL_TYPE_NUMBER,
  TABLE_CAN_SELECT,
} from "../src/utils/ui/styles/CoolTableStyles.jsx";
import AppSettings from "../src/AppSettings.jsx";
import { KEY_VIEWPORT_DIMENSIONS } from "../src/settings/RootSettings.jsx";
import {
  KEY_STUDY_PATHS_FRAME_SETTINGS,
  KEY_STUDY_PATHS_LEGEND_SPLITTER_POS,
  KEY_STUDY_PATHS_SPLITTER_POS,
  KEY_STUDY_PATHS_STEPS_SPLITTER_POS,
  KEY_STUDY_SPLITTER_POS_PX,
  STUDY_SPLITTER_KEYS,
} from "../src/settings/StudySettings.jsx";
import AppText from "../src/AppText.jsx";
import {
  KEY_STUDY_CARDINALITY,
  KEY_STUDY_PATHS,
} from "../src/text/StudyText.jsx";

const UPDATE_INTERVAL_MS = 1000;

const TABLE_COLUMNS = [
  {
    id: "cardinality",
    label_key: KEY_STUDY_CARDINALITY,
    width_px: 100,
    type: CELL_TYPE_NUMBER,
    align: CELL_ALIGN_CENTER,
  },
];

export class StudyPaths extends Component {
  state = {
    rendered_width: 0,
    rendered_height: 0,
    interval: null,
    container_ref: React.createRef(),
    bounding_rect: {},
    frame_settings: {},
    subscription: null,
    core_points: [],
    selected_point: -1,
    selected_cardinality: -1,
  };

  componentDidMount() {
    this.update_dimensions();
    const frame_settings = AppSettings.get(KEY_STUDY_PATHS_FRAME_SETTINGS);
    this.identify_cores(frame_settings);
    this.setState({
      frame_settings,
      interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
      subscription: AppSettings.subscribe(
        KEY_STUDY_PATHS_FRAME_SETTINGS,
        this.on_frame_settings_changed,
      ),
    });
  }

  componentWillUnmount() {
    const { interval, subscription } = this.state;
    if (interval) {
      clearInterval(interval);
    }
    if (subscription) {
      AppSettings.unsubscribe(subscription);
    }
  }

  identify_cores = (frame_settings, selected_point = -1) => {
    const { selected_cardinality } = this.state;
    const orbital_bins = identify_cores(frame_settings);
    if (!orbital_bins) {
      return;
    }
    const core_points = orbital_bins
      .filter((bin) => !bin.exclude)
      .sort((a, b) => a.lowest_iterations - b.lowest_iterations)
      .slice(0, 5);
    core_points.forEach((point, i) => {
      if (selected_cardinality > 0) {
        if (point.cardinality !== selected_cardinality) {
          return;
        }
        this.setState({ selected_point: i });
      } else if (selected_cardinality > 0) {
        return;
      }
      if (selected_point >= 0 && i !== selected_point) {
        return;
      }
      highlight_canvas(frame_settings.ctx, point.canvas_x, point.canvas_y);
    });
    this.setState({ core_points });
  };

  on_frame_settings_changed = (key, value) => {
    // console.log('on_frame_settings_changed', value)
    this.setState({ frame_settings: value, selected_point: -1 });
    this.identify_cores(value);
  };

  update_dimensions = () => {
    const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS);
    // console.log('viewport_dimensions', viewport_dimensions)
    const splitter_width = AppSettings.get(KEY_STUDY_SPLITTER_POS_PX);
    this.setState({
      rendered_width: viewport_dimensions.width - splitter_width,
      rendered_height: viewport_dimensions.height,
    });
  };

  find_focal_point = (selected_point) => {
    const { frame_settings, core_points } = this.state;
    const point = core_points[selected_point];
    const half_scope = frame_settings.scope / 2;
    const leftmost = frame_settings.focal_point.x - half_scope;
    const topmost = frame_settings.focal_point.y + half_scope;
    const increment = frame_settings.scope / frame_settings.width_px;
    const x = leftmost + increment * point.canvas_x;
    const y = topmost - increment * point.canvas_y;
    return { x, y };
  };

  on_select_point = (selected_point) => {
    const { frame_settings, core_points } = this.state;
    const point = core_points[selected_point];
    this.setState({
      selected_point,
      selected_cardinality: point.cardinality,
    });
    // this.identify_cores(frame_settings, selected_point)
    frame_settings.focal_point = this.find_focal_point(selected_point);
    AppSettings.on_settings_changed({
      [KEY_STUDY_PATHS_FRAME_SETTINGS]: frame_settings,
    });
  };

  render() {
    const {
      core_points,
      container_ref,
      rendered_height,
      rendered_width,
      frame_settings,
      selected_point,
    } = this.state;
    let top = 0;
    let left = 0;
    if (container_ref.current) {
      const container_bounds = container_ref.current.getBoundingClientRect();
      top = container_bounds.top;
      left = container_bounds.left;
    }
    const bounding_rect = {
      top,
      left,
      width: rendered_width,
      height: rendered_height,
    };
    let points_table = [];
    if (core_points) {
      // console.log('core_points', core_points)
      points_table = (
        <CoolTable
          columns={TABLE_COLUMNS}
          data={core_points}
          options={[TABLE_CAN_SELECT]}
          selected_row={selected_point}
          on_select_row={this.on_select_point}
        />
      );
    }
    const splitter_pos = AppSettings.get(KEY_STUDY_PATHS_SPLITTER_POS);
    const right_block_style = {
      left: `${splitter_pos + MARGIN_PX}px`,
      top: `${top + MARGIN_PX}px`,
    };
    return [
      <styles.SectionTitle key={"study-overview-title"}>
        {AppText.get(KEY_STUDY_PATHS)}
      </styles.SectionTitle>,
      <styles.TightCenteredBlock ref={container_ref} key={"generator-content"}>
        <NavigatorSplitterLayout
          bounding_rect={bounding_rect}
          frame_settings={frame_settings}
          frame_settings_key={KEY_STUDY_PATHS_FRAME_SETTINGS}
          splitter_keys={STUDY_SPLITTER_KEYS}
        />
        <styles.FixedInlineBlock style={right_block_style}>
          {points_table}
        </styles.FixedInlineBlock>
      </styles.TightCenteredBlock>,
    ];
  }
}

export default StudyPaths;
