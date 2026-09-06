import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import { Chart as ChartJS, registerables } from "chart.js";
ChartJS.register(...registerables);

import {
  MainStyles as styles,
  MARGIN_PX,
} from "../../../styles/MainStyles.jsx";
import { click_point_chart } from "../../../utils/render/PatternsUtils.jsx";
import { copy_json } from "../../../utils/Dom.jsx";
import { CoolSlider, CoolStyles } from "../../../utils/ui/CoolImports.jsx";
import * as Math from "mathjs";
import { find_bounds } from "../../../chart/ChartUtils.jsx";
import { render_magnitude } from "../StudyUtils.jsx";

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
const SliderWrapper = styled(CoolStyles.Block)`
  padding: 0 ${MARGIN_PX}px;
`;
const SummaryWrapper = styled(CoolStyles.Block)`
  ${CoolStyles.align_center}
  padding: 0 ${MARGIN_PX}px;
  height: 2rem;
`;

export class PointsSeriesChart extends Component {
  static propTypes = {
    chart_data: PropTypes.array.isRequired,
    width_px: PropTypes.number.isRequired,
    waiting: PropTypes.bool.isRequired,
    title: PropTypes.string.isRequired,
  };

  state = {
    slider_value: 50,
    point_data: [],
    scaled_picos: 0,
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
    const { slider_value } = this.state;
    const { chart_data } = this.props;
    if (!chart_data) {
      return [];
    }
    let point_count = chart_data.length / 20;
    if (point_count < 100) {
      point_count = 100;
    }
    const max_slider = chart_data.length;
    const slice_start = (max_slider * slider_value - point_count) / 100;
    console.log(
      "slice_start, max_slider,chart_data.length",
      slice_start,
      max_slider,
      chart_data.length,
    );

    let point_list = copy_json(chart_data);
    const point_data = point_list
      .sort((a, b) => a.step - b.step)
      .slice(slice_start, slice_start + point_count)
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
    const bounds = find_bounds(point_data, [], false, false);
    const scaled_extent = bounds.max_x - bounds.min_x;
    const scaled_picos = scaled_extent / 10;
    this.setState({ point_data, scaled_picos });
  };

  slider_change = (e) => {
    this.setState({ slider_value: e.target.value });
    setTimeout(this.format_point_data, 250);
  };

  render() {
    const { point_data, slider_value, scaled_picos } = this.state;
    const { width_px, title } = this.props;
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
        <SliderWrapper>
          <CoolSlider
            is_vertical={false}
            value={slider_value}
            min={0}
            max={100}
            step_count={1000}
            on_change={this.slider_change}
          />
        </SliderWrapper>
        <SummaryWrapper>
          scale: {render_magnitude(scaled_picos, true)}
        </SummaryWrapper>
      </styles.ContentWrapper>
    );
  }
}

export default PointsSeriesChart;
