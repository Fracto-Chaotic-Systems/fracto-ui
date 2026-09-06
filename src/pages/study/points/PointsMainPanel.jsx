import React, { Component } from "react";

import FractoFastCalc from "../../../../../../sdk/FractoFastCalc.js";

import {
  MainStyles as styles,
  MARGIN_PX,
} from "../../../styles/MainStyles.jsx";
import AppSettings from "../../../AppSettings.jsx";
import {
  KEY_STUDY_POINTS_FRAME_SETTINGS,
  KEY_STUDY_POINTS_SPLITTER_POS,
  KEY_STUDY_SPLITTER_POS_PX,
} from "../../../settings/StudySettings.jsx";

import { update_dimensions } from "./../../PageUtils.jsx";
import DataBackend from "../../../backend/DataBackend.jsx";
import PointsSeriesTable from "./PointsSeriesTable.jsx";
import PointsSeriesChart from "./PointsSeriesChart.jsx";
import Complex from "../../../../../../sdk/math/Complex.js";

const UPDATE_INTERVAL_MS = 1000;

export class PointsMainPanel extends Component {
  state = {
    rendered_width: 0,
    rendered_height: 0,
    interval: null,
    frame_settings: {},
    subscription: null,
    in_fetch: false,
    pro_chart_data: [],
    retro_chart_data: [],
    newton_chart_data: [],
    pro_derived: [],
    retro_derived: [],
    newton_derived: [],
    set2: [],
  };

  componentDidMount() {
    this.update_dimensions();
    this.setState({
      interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
      frame_settings: AppSettings.get(KEY_STUDY_POINTS_FRAME_SETTINGS),
      subscription: AppSettings.subscribe(
        KEY_STUDY_POINTS_FRAME_SETTINGS,
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

  on_frame_settings_changed = (key, value) => {
    if (
      Number.isNaN(value.focal_point.x) ||
      Number.isNaN(value.focal_point.y)
    ) {
      console.log("on_frame_settings_changed bad number", value);
      return;
    }
    let set2 = [];
    if (value && value.focal_point) {
      console.log("value", value);
      const { focal_point } = value;
      const Q_core_neg = FractoFastCalc.calculate_cardioid_Q(
        focal_point.x,
        focal_point.y,
        -1,
      );
      set2 = [Q_core_neg];
    }
    this.setState({
      frame_settings: value,
      set2,
    });
    this.on_chart_update(key, value);
  };

  update_dimensions = () => {
    const { rendered_width, rendered_height } = this.state;
    const new_values = update_dimensions(
      rendered_width,
      rendered_height,
      KEY_STUDY_SPLITTER_POS_PX,
    );
    if (new_values) {
      this.setState(new_values);
    }
  };

  format_point_data = (derived, slice = 250) => {
    let { point_list } = derived;
    return point_list
      .sort((a, b) => a.step - b.step)
      .slice(-slice)
      .map((data) => {
        if (data.scaled_point.re === "NaN" || data.scaled_point.im === "NaN") {
          return {
            x_unscaled: parseFloat(data.point.re),
            y_unscaled: parseFloat(data.point.im),
            x_str: data.point.re,
            y_str: data.point.im,
            x: parseFloat(data.point.re),
            y: parseFloat(data.point.im),
            x_scaled_str: data.point.re,
            y_scaled_str: data.point.im,
          };
        } else {
          return {
            x_unscaled: parseFloat(data.point.re),
            y_unscaled: parseFloat(data.point.im),
            x_str: data.point.re,
            y_str: data.point.im,
            x: parseFloat(data.scaled_point.re),
            y: parseFloat(data.scaled_point.im),
            x_scaled_str: data.scaled_point.re,
            y_scaled_str: data.scaled_point.im,
          };
        }
      });
  };

  test_theory = (big_points, P_coords) => {
    const point_list = big_points.point_list.slice(
      -(big_points.cardinality + 1),
    );
    console.log(`Test points ${point_list.length}`, point_list);
    const all_points = point_list.map((data) => {
      return new Complex(parseFloat(data.point.re), parseFloat(data.point.im));
    });
    const P = new Complex(P_coords.x, P_coords.y);
    let sum = new Complex(1, 0);
    for (let i = 0; i < all_points.length - 1; i++) {
      sum = sum.add(all_points[i]);
    }
    const sum_squared = sum.mul(sum);
    const negative_sum = sum.scale(-1);
    const sum_squared_add_P = sum_squared.add(P);
    const sum_squared_minus_sum = sum_squared.add(negative_sum);
    const sum_squared_minus_sum_add_P = sum_squared_minus_sum.add(P);
    console.log(
      "test_theory, sum, sum_squared_add_P, sum_squared_minus_sum_add_P",
      sum.toString(),
      sum_squared_add_P.toString(),
      sum_squared_minus_sum_add_P.toString(),
    );
  };

  on_chart_update = (key, value) => {
    const { in_fetch } = this.state;
    if (in_fetch) {
      return;
    }
    this.setState({ in_fetch: true });
    DataBackend.get_orbitals(value.focal_point, 50000, (all_results) => {
      if (all_results.error) {
        console.log("get_orbitals error", all_results.error);
        return;
      }
      const { pro_derived, retro_derived, newton_derived } = all_results.result;
      const pro_chart_data = this.format_point_data(pro_derived);
      const retro_chart_data = this.format_point_data(retro_derived);
      const newton_chart_data = this.format_point_data(
        newton_derived,
        newton_derived.cardinality,
      );
      // this.test_theory(pro_derived, value.focal_point)
      // console.log('retro_chart_data', retro_chart_data)
      console.log("pro_derived, pro_chart_data", pro_derived, pro_chart_data);
      console.log(
        "retro_derived, retro_chart_data",
        retro_derived,
        retro_chart_data,
      );
      console.log(
        "newton_derived, newton_chart_data",
        newton_derived,
        newton_chart_data,
      );
      this.setState({
        pro_derived,
        retro_derived,
        newton_derived,
        pro_chart_data,
        retro_chart_data,
        newton_chart_data,
        in_fetch: false,
      });
    });
  };

  get_table_data = (chart_data) => {
    return chart_data.reverse().map((data, step) => {
      const { x_str, y_str } = data;
      return { x: x_str, y: y_str, step };
    });
  };

  get_chart_width_px = () => {
    const { rendered_width } = this.state;
    const splitter_pos_1 = AppSettings.get(KEY_STUDY_POINTS_SPLITTER_POS);
    const splitter_pos_2 = AppSettings.get(KEY_STUDY_SPLITTER_POS_PX);
    return (
      (rendered_width - splitter_pos_1 + splitter_pos_2 - 3 * MARGIN_PX) / 3 -
      3 * MARGIN_PX
    );
  };

  render() {
    const {
      in_fetch,
      pro_derived,
      retro_derived,
      newton_derived,
      pro_chart_data,
      retro_chart_data,
      newton_chart_data,
    } = this.state;
    const chart_width = this.get_chart_width_px();
    const pro_table_data = this.get_table_data(pro_chart_data);
    const retro_table_data = this.get_table_data(retro_chart_data);
    return (
      <styles.ScrollingBlock key={"orbitals-table"}>
        <PointsSeriesChart
          chart_data={retro_derived.point_list}
          width_px={chart_width}
          waiting={!in_fetch}
          title={"retro-iterative"}
        />
        <PointsSeriesChart
          chart_data={pro_derived.point_list}
          width_px={chart_width}
          waiting={!in_fetch}
          title={"pro-iterative"}
        />
        <PointsSeriesChart
          chart_data={newton_derived.point_list}
          width_px={chart_width}
          waiting={!in_fetch}
          title={"Newton derived"}
        />
        <styles.ScrollingBlock>
          <styles.ScrollingInlineBlock>
            <PointsSeriesTable table_data={retro_table_data} />
          </styles.ScrollingInlineBlock>
          <styles.ScrollingInlineBlock>
            <PointsSeriesTable table_data={pro_table_data} />
          </styles.ScrollingInlineBlock>
        </styles.ScrollingBlock>
      </styles.ScrollingBlock>
    );
  }
}

export default PointsMainPanel;
