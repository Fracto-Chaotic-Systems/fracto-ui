import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import { Chart as ChartJS, registerables } from "chart.js";
ChartJS.register(...registerables);

import { MainStyles as styles } from "../../../styles/MainStyles.jsx";
import DataBackend from "../../../backend/DataBackend.jsx";

export class CircuitryChart extends Component {
  static propTypes = {
    focal_point: PropTypes.object.isRequired,
    height_px: PropTypes.number.isRequired,
    width_px: PropTypes.number.isRequired,
  };

  state = {
    circuitry_data: null,
    error: null,
  };

  componentDidMount() {
    this.load_circuitry(this.props.focal_point);
  }

  componentDidUpdate(prevProps) {
    const { focal_point } = this.props;
    const previous_focal_point = prevProps.focal_point;
    if (
      focal_point.x !== previous_focal_point.x ||
      focal_point.y !== previous_focal_point.y
    ) {
      this.load_circuitry(focal_point);
    }
  }

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
    return `CircuitryChart ${width_px}${height_px}}`;
  }
}

export default CircuitryChart;
