import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import { Chart as ChartJS, registerables } from "chart.js";
ChartJS.register(...registerables);

import { MainStyles as styles } from "../../../styles/MainStyles.jsx";

export class CircuitryChart extends Component {
  static propTypes = {
    focal_point: PropTypes.object.isRequired,
    rendered_height: PropTypes.number.isRequired,
    rendered_width: PropTypes.number.isRequired,
  };

  state = {};

  render() {
    const { rendered_width, rendered_height } = this.props;
    return `CircuitryChart ${rendered_width}${rendered_height}}`;
  }
}

export default CircuitryChart;
