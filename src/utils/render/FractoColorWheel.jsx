import React, { Component } from "react";
import PropTypes from "prop-types";

import { ColorWheelStyles as styles } from "./styles/ColorWheelStyles";
import { color_wheel, draw_circle, TWO_PI } from "./ColorWheelUtils";
import FractoColors from "./FractoColors.jsx";

export class FractoColorWheel extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
  };

  state = {
    canvas_ref: React.createRef(),
    temp_color_phase: 0,
  };

  componentDidMount() {
    this.fill_canvas();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (
      prevProps.width_px !== this.props.width_px ||
      prevState.temp_color_phase !== this.state.temp_color_phase
    ) {
      this.fill_canvas();
    }
  }

  fill_canvas = () => {
    const { canvas_ref, temp_color_phase } = this.state;
    const { width_px } = this.props;
    if (!canvas_ref.current) {
      return;
    }
    const ctx = canvas_ref.current.getContext("2d");
    ctx.fillStyle = "#eeeeee";
    ctx.fillRect(0, 0, width_px, width_px);
    ctx.font = "20px Arial";
    ctx.textAlign = "center";

    const radius = width_px * 0.44;
    color_wheel(canvas_ref, radius, 6, temp_color_phase);

    const size_by_two = width_px / 2;
    const angle = -Math.PI / 2 - (temp_color_phase * TWO_PI) / 360;
    let [h, s, l] = FractoColors.fracto_pattern_color_hsl(1, 500);
    const ball_color = `hsl(0, ${s}%, ${l}%)`;
    const radius_margin = width_px / 30;
    const indicator_x =
      size_by_two + Math.cos(angle) * (radius + radius_margin);
    const indicator_y =
      size_by_two + Math.sin(angle) * (radius + radius_margin);
    draw_circle(ctx, indicator_x, indicator_y, radius_margin / 3, ball_color);
  };

  color_angle = (e) => {
    const { canvas_ref } = this.state;
    const { width_px } = this.props;
    const clientRect = canvas_ref.current.getBoundingClientRect();
    const canvas_x = e.clientX - clientRect.left;
    const canvas_y = e.clientY - clientRect.top;
    let angle =
      Math.PI / 2 +
      Math.atan2(canvas_y - width_px / 2, canvas_x - width_px / 2);
    while (angle < 0) {
      angle += TWO_PI;
    }
    while (angle > TWO_PI) {
      angle -= TWO_PI;
    }
    return angle;
  };

  on_click = (e) => {
    const { canvas_ref } = this.state;
    if (!canvas_ref.current) {
      return;
    }
    const angle = this.color_angle(e);
    this.fill_canvas();
  };

  on_hover = (e) => {
    const angle = this.color_angle(e);
    this.setState({ temp_color_phase: (-360 * angle) / TWO_PI });
  };

  on_leave = (e) => {
    console.log("FractoColorWheel on_leave");
  };

  render() {
    const { canvas_ref } = this.state;
    const { width_px } = this.props;
    return (
      <styles.ColorWheelCanvas
        onClick={this.on_click}
        onMouseMove={this.on_hover}
        onMouseLeave={this.on_leave}
        ref={canvas_ref}
        width={width_px}
        height={width_px}
      />
    );
  }
}

export default FractoColorWheel;
