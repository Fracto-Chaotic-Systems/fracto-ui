import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import { Chart as ChartJS, registerables } from "chart.js";
ChartJS.register(...registerables);

import { MainStyles as styles } from "../../../styles/MainStyles.jsx";
import DataBackend from "../../../backend/DataBackend.jsx";
import { click_point_chart } from "../../../utils/render/PatternsUtils.jsx";

export class CircuitryChart extends Component {
  static propTypes = {
    focal_point: PropTypes.object,
    height_px: PropTypes.number.isRequired,
    width_px: PropTypes.number.isRequired,
  };

  state = {
    circuitry_data: null,
    error: null,
  };

  componentDidMount() {
    if (this.has_focal_point(this.props.focal_point)) {
      this.load_circuitry(this.props.focal_point);
    }
  }

  componentDidUpdate(prevProps) {
    const { focal_point } = this.props;
    const previous_focal_point = prevProps.focal_point;
    if (!this.has_focal_point(focal_point)) {
      return;
    }
    if (
      !this.has_focal_point(previous_focal_point) ||
      focal_point.x !== previous_focal_point.x ||
      focal_point.y !== previous_focal_point.y
    ) {
      this.load_circuitry(focal_point);
    }
  }

  has_focal_point = (focal_point) =>
    focal_point &&
    Number.isFinite(Number(focal_point.x)) &&
    Number.isFinite(Number(focal_point.y));

  load_circuitry = (focal_point) => {
    DataBackend.get_circuitry(focal_point, (response) => {
      if (response.error) {
        this.setState({ error: response.error });
        return;
      }
      this.setState({ circuitry_data: response, error: null });
    });
  };

  render() {
    const { width_px, height_px } = this.props;
    const { circuitry_data, error } = this.state;
    const chart_size = Math.max(0, Math.min(width_px, height_px));
    const points = (circuitry_data?.result || []).map(({ C }) => ({
      x: C.re,
      y: C.im,
    }));
    const orbital_points = (circuitry_data?.result || [])
      .filter(({ t }) => Math.abs(t - Math.round(t)) < 1e-9)
      .map(({ C }) => ({
        x: C.re,
        y: C.im,
      }));
    const chart_style = {
      width: `${chart_size}px`,
      height: `${chart_size}px`,
    };
    return (
      <styles.ContentWrapper style={chart_style}>
        {error
          ? error
          : points.length > 0
            ? click_point_chart(
                points,
                orbital_points,
                false,
                false,
                null,
                "#888888",
                false,
                4,
              )
            : null}
      </styles.ContentWrapper>
    );
  }
}

export default CircuitryChart;
