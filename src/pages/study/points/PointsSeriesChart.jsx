import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import { Chart as ChartJS, registerables } from "chart.js";
ChartJS.register(...registerables);

import {
  MainStyles as styles,
  MARGIN_PX,
} from "../../../styles/MainStyles.jsx";
import AppText from "../../../AppText.jsx";
import {
  KEY_STUDY_CARDINALITY,
  KEY_STUDY_DETECTOR_HORIZON,
  KEY_STUDY_DETECTOR_ITERATIONS,
  KEY_STUDY_ELAPSED_TIME,
  KEY_STUDY_ITERATIONS,
  KEY_STUDY_MAGNITUDE,
  KEY_STUDY_NEWTON_CYCLES,
  KEY_STUDY_NEWTON_EFFORT,
} from "../../../text/StudyText.jsx";
import { click_point_chart } from "../../../utils/render/PatternsUtils.jsx";
import { copy_json } from "../../../utils/Dom.jsx";
import { CoolStyles } from "../../../utils/ui/CoolImports.jsx";
import { CELL_LABEL_STYLE } from "../../../utils/ui/styles/CoolTableStyles.jsx";
import * as Math from "mathjs";

const ChartWrapper = styled(CoolStyles.InlineBlock)`
  ${CoolStyles.pointer}
  margin: ${MARGIN_PX}px ${MARGIN_PX}px 0;
  border: 1.5px solid #666666;
  border-radius: 3px;
  box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.25);
  background-color: #fcfcfc;
`;
const ChartTitle = styled(CoolStyles.Block)`
  ${CoolStyles.italic}
  ${CoolStyles.underline}
    ${CoolStyles.align_center}
    font-size: 1.25rem;
  color: #666666;
  height: 2rem;
`;
const SummaryWrapper = styled(CoolStyles.Block)`
  ${CoolStyles.align_center}
  padding: 0 ${MARGIN_PX}px;
  height: 2rem;
`;

export class PointsSeriesChart extends Component {
  static propTypes = {
    chart_data: PropTypes.array.isRequired,
    cardinality: PropTypes.number.isRequired,
    elapsed_ms: PropTypes.number.isRequired,
    iterations: PropTypes.number,
    detector_iterations: PropTypes.number,
    detector_horizon_iterations: PropTypes.number,
    newton_cycles: PropTypes.number,
    newton_effort: PropTypes.number,
    width_px: PropTypes.number.isRequired,
    waiting: PropTypes.bool.isRequired,
    title: PropTypes.string.isRequired,
  };

  state = {
    point_data: [],
    point_magnitude: 0,
  };

  componentDidMount() {
    this.format_point_data();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const { chart_data } = this.props;
    if (prevProps.chart_data !== chart_data) {
      this.format_point_data();
    }
  }

  format_point_data = () => {
    const { chart_data } = this.props;
    if (!chart_data) {
      return [];
    }
    let point_list = copy_json(chart_data);
    const point_data = point_list
      .sort((a, b) => a.step - b.step)
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
    const point_magnitude = point_data.reduce(
      (maximum, point) => Math.max(maximum, Math.hypot(point.x, point.y)),
      0,
    );
    this.setState({ point_data, point_magnitude });
  };

  render() {
    const { point_data, point_magnitude } = this.state;
    const {
      cardinality,
      detector_iterations,
      detector_horizon_iterations,
      elapsed_ms,
      iterations,
      newton_cycles,
      newton_effort,
      width_px,
      title,
    } = this.props;
    const numeric_value_style = {
      color: "black",
      fontFamily: "monospace",
      fontWeight: "bold",
    };
    const unit_style = {
      color: "#666666",
      fontStyle: "italic",
    };
    const chart_style = {
      width: `${width_px}px`,
      height: `${width_px}px`,
    };
    return (
      <styles.ContentWrapper>
        <ChartTitle>{title}</ChartTitle>
        <ChartWrapper style={chart_style}>
          {click_point_chart(point_data)}
        </ChartWrapper>
        <SummaryWrapper>
          <span style={CELL_LABEL_STYLE}>
            {AppText.get(KEY_STUDY_ELAPSED_TIME)}:
          </span>{" "}
          <span style={numeric_value_style}>{elapsed_ms.toFixed(1)}</span>
          <span style={unit_style}>ms</span>
          <br />
          <span style={CELL_LABEL_STYLE}>
            {AppText.get(KEY_STUDY_MAGNITUDE)}:
          </span>{" "}
          <span style={numeric_value_style}>{point_magnitude}</span>
          <br />
          <span style={CELL_LABEL_STYLE}>
            {AppText.get(KEY_STUDY_CARDINALITY)}:
          </span>{" "}
          <span style={numeric_value_style}>{cardinality}</span>
          {iterations !== undefined ? (
            <>
              <br />
              <span style={CELL_LABEL_STYLE}>
                {AppText.get(KEY_STUDY_ITERATIONS)}:
              </span>{" "}
              <span style={numeric_value_style}>{iterations}</span>
            </>
          ) : null}
          {detector_iterations !== undefined ? (
            <>
              <br />
              <span style={CELL_LABEL_STYLE}>
                {AppText.get(KEY_STUDY_DETECTOR_ITERATIONS)}:
              </span>{" "}
              <span style={numeric_value_style}>{detector_iterations}</span>
            </>
          ) : null}
          {detector_horizon_iterations !== undefined ? (
            <>
              <br />
              <span style={CELL_LABEL_STYLE}>
                {AppText.get(KEY_STUDY_DETECTOR_HORIZON)}:
              </span>{" "}
              <span style={numeric_value_style}>
                {detector_horizon_iterations}
              </span>
            </>
          ) : null}
          {newton_cycles !== undefined ? (
            <>
              <br />
              <span style={CELL_LABEL_STYLE}>
                {AppText.get(KEY_STUDY_NEWTON_CYCLES)}:
              </span>{" "}
              <span style={numeric_value_style}>{newton_cycles}</span>
            </>
          ) : null}
          {newton_effort !== undefined ? (
            <>
              <br />
              <span style={CELL_LABEL_STYLE}>
                {AppText.get(KEY_STUDY_NEWTON_EFFORT)}:
              </span>{" "}
              <span style={numeric_value_style}>{newton_effort}</span>{" "}
              <span style={unit_style}>steps</span>
            </>
          ) : null}
        </SummaryWrapper>
      </styles.ContentWrapper>
    );
  }
}

export default PointsSeriesChart;
