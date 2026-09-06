import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { wait_icon, wait_icon_2 } from "../utils/ui/CoolIcons.jsx";

import { CoolStyles } from "../utils/ui/styles/CoolStyles.jsx";

const TRANSIT_PADDING_PX = 5;
const CURVED_CORNERS_FACTOR = 25;
const WAIT_ICON_SIZE_PX = 35;

const CanvasSubstrate = styled.canvas`
  ${CoolStyles.narrow_box_shadow}
  margin: ${TRANSIT_PADDING_PX}px;
`;

const CanvasWrapper = styled(CoolStyles.InlineBlock)`
  margin: 0;
`;

const WaitIconWrapper = styled(CoolStyles.InlineBlock)`
  position: absolute;
  left: 0;
  fill: white;
  height: ${WAIT_ICON_SIZE_PX}px;
  width: ${WAIT_ICON_SIZE_PX}px;
  opacity: 0.75;
`;

const ARROW_UP_ONE = "arrow_up_one";
const ARROW_RIGHT_ONE = "arrow_right_one";
const ARROW_DOWN_ONE = "arrow_down_one";
const ARROW_LEFT_ONE = "arrow_left_one";
const ARROW_UP_TWO = "arrow_up_two";
const ARROW_RIGHT_TWO = "arrow_right_two";
const ARROW_DOWN_TWO = "arrow_down_two";
const ARROW_LEFT_TWO = "arrow_left_two";
const ARROW_UPPER_LEFT_ONE = "arrow_upper_left_one";
const ARROW_UPPER_RIGHT_ONE = "arrow_upper_right_one";
const ARROW_LOWER_LEFT_ONE = "arrow_lower_left_one";
const ARROW_LOWER_RIGHT_ONE = "arrow_lower_right_one";
const ARROW_UPPER_LEFT_TWO = "arrow_upper_left_two";
const ARROW_UPPER_RIGHT_TWO = "arrow_upper_right_two";
const ARROW_LOWER_LEFT_TWO = "arrow_lower_left_two";
const ARROW_LOWER_RIGHT_TWO = "arrow_lower_right_two";
const ARROW_UPPER_LEFT_THREE = "arrow_upper_left_three";
const ARROW_UPPER_RIGHT_THREE = "arrow_upper_right_three";
const ARROW_LOWER_LEFT_THREE = "arrow_lower_left_three";
const ARROW_LOWER_RIGHT_THREE = "arrow_lower_right_three";
const ARROW_UP_THREE = "arrow_up_three";
const ARROW_RIGHT_THREE = "arrow_right_three";
const ARROW_LEFT_THREE = "arrow_left_three";
const ARROW_DOWN_THREE = "arrow_down_three";

const REGULAR_SAT_PCT = 5;
const HOVER_SAT_PCT = 65;
const CLICK_SAT_PCT = 100;

const LUMINOSITY_ONE_PCT = 70;
const LUMINOSITY_TWO_PCT = 60;
const LUMINOSITY_THREE_PCT = 50;

const ONE_DOT_FACTOR = 1 / 20;
const TWO_DOT_FACTOR = 1 / 3;
const THREE_DOT_FACTOR = 1;

export class NavigatorTransit extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    scope: PropTypes.number.isRequired,
    focal_point: PropTypes.object.isRequired,
    on_focal_point_changed: PropTypes.func.isRequired,
    in_wait: PropTypes.bool.isRequired,
  };

  state = {
    ctx: null,
    canvas_ref: React.createRef(),
    canvas_measure_px: 0,
    in_hover: null,
    in_click: null,
    wait_icon: wait_icon,
  };

  componentDidMount() {
    const { canvas_ref } = this.state;
    const { width_px } = this.props;
    const canvas = canvas_ref.current;
    if (!canvas) {
      console.log("no canvas");
      return;
    }
    const ctx = canvas.getContext("2d");
    this.setState({
      canvas_measure_px: width_px - 2 * TRANSIT_PADDING_PX,
      ctx: ctx,
    });
    ctx.fillStyle = "#aaaaaa";
    ctx.fillRect(0, 0, width_px, width_px);
    setTimeout(() => {
      this.draw_paths();
    }, 1000);
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.width_px !== this.props.width_px) {
      this.setState({
        canvas_measure_px: this.props.width_px - 2 * TRANSIT_PADDING_PX,
      });
    }
    this.draw_paths();
  }

  pattern_color = (pattern, sat_pct, lum_pct) => {
    const log2 = Math.log2(pattern);
    const hue = pattern ? 360 * (log2 - Math.floor(log2)) : 0;
    return `hsl(${hue}, ${sat_pct}%, ${lum_pct}%)`;
  };

  static all_regions = [];
  static is_wait_icon_2 = false;

  make_regions = () => {
    const { canvas_measure_px } = this.state;
    if (NavigatorTransit.all_regions.length) {
      return NavigatorTransit.all_regions;
    }
    const sqrt_two = Math.sqrt(2.0);
    const A_PCT = (1 - 0.618) * 100;
    const midway = canvas_measure_px / 2;
    const A = (A_PCT * canvas_measure_px) / 100;
    const A_sqrt_two_by_2 = (sqrt_two * A) / 2;
    NavigatorTransit.all_regions = [
      {
        id: ARROW_UP_ONE,
        colors: {
          regular: this.pattern_color(1, REGULAR_SAT_PCT, LUMINOSITY_ONE_PCT),
          hover: this.pattern_color(1, HOVER_SAT_PCT, LUMINOSITY_ONE_PCT),
          click: this.pattern_color(1, CLICK_SAT_PCT, LUMINOSITY_ONE_PCT),
        },
        path: [
          { x: midway - A_sqrt_two_by_2 / 4, y: midway - A / 2 },
          { x: midway + A_sqrt_two_by_2 / 4, y: midway - A / 2 },
          { x: midway + A_sqrt_two_by_2 / 4, y: midway - A_sqrt_two_by_2 / 4 },
          { x: midway - A_sqrt_two_by_2 / 4, y: midway - A_sqrt_two_by_2 / 4 },
        ],
      },
      {
        id: ARROW_RIGHT_ONE,
        colors: {
          regular: this.pattern_color(3, REGULAR_SAT_PCT, LUMINOSITY_ONE_PCT),
          hover: this.pattern_color(3, HOVER_SAT_PCT, LUMINOSITY_ONE_PCT),
          click: this.pattern_color(3, CLICK_SAT_PCT, LUMINOSITY_ONE_PCT),
        },
        path: [
          { x: midway + A / 2, y: midway - A_sqrt_two_by_2 / 4 },
          { x: midway + A / 2, y: midway + A_sqrt_two_by_2 / 4 },
          { x: midway + A_sqrt_two_by_2 / 4, y: midway + A_sqrt_two_by_2 / 4 },
          { x: midway + A_sqrt_two_by_2 / 4, y: midway - A_sqrt_two_by_2 / 4 },
        ],
      },
      {
        id: ARROW_DOWN_ONE,
        colors: {
          regular: this.pattern_color(5, REGULAR_SAT_PCT, LUMINOSITY_ONE_PCT),
          hover: this.pattern_color(5, HOVER_SAT_PCT, LUMINOSITY_ONE_PCT),
          click: this.pattern_color(5, CLICK_SAT_PCT, LUMINOSITY_ONE_PCT),
        },
        path: [
          { x: midway + A_sqrt_two_by_2 / 4, y: midway + A / 2 },
          { x: midway - A_sqrt_two_by_2 / 4, y: midway + A / 2 },
          { x: midway - A_sqrt_two_by_2 / 4, y: midway + A_sqrt_two_by_2 / 4 },
          { x: midway + A_sqrt_two_by_2 / 4, y: midway + A_sqrt_two_by_2 / 4 },
        ],
      },
      {
        id: ARROW_LEFT_ONE,
        colors: {
          regular: this.pattern_color(7, REGULAR_SAT_PCT, LUMINOSITY_ONE_PCT),
          hover: this.pattern_color(7, HOVER_SAT_PCT, LUMINOSITY_ONE_PCT),
          click: this.pattern_color(7, CLICK_SAT_PCT, LUMINOSITY_ONE_PCT),
        },
        path: [
          { x: midway - A / 2, y: midway + A_sqrt_two_by_2 / 4 },
          { x: midway - A / 2, y: midway - A_sqrt_two_by_2 / 4 },
          { x: midway - A_sqrt_two_by_2 / 4, y: midway - A_sqrt_two_by_2 / 4 },
          { x: midway - A_sqrt_two_by_2 / 4, y: midway + A_sqrt_two_by_2 / 4 },
        ],
      },
      {
        id: ARROW_UPPER_LEFT_ONE,
        colors: {
          regular: this.pattern_color(17, REGULAR_SAT_PCT, LUMINOSITY_ONE_PCT),
          hover: this.pattern_color(17, HOVER_SAT_PCT, LUMINOSITY_ONE_PCT),
          click: this.pattern_color(17, CLICK_SAT_PCT, LUMINOSITY_ONE_PCT),
        },
        path: [
          { x: midway - A / 2, y: midway - A / 2 },
          { x: midway - A_sqrt_two_by_2 / 4, y: midway - A / 2 },
          { x: midway - A_sqrt_two_by_2 / 4, y: midway - A_sqrt_two_by_2 / 4 },
          { x: midway - A / 2, y: midway - A_sqrt_two_by_2 / 4 },
        ],
      },
      {
        id: ARROW_UPPER_RIGHT_ONE,
        colors: {
          regular: this.pattern_color(17, REGULAR_SAT_PCT, LUMINOSITY_ONE_PCT),
          hover: this.pattern_color(17, HOVER_SAT_PCT, LUMINOSITY_ONE_PCT),
          click: this.pattern_color(17, CLICK_SAT_PCT, LUMINOSITY_ONE_PCT),
        },
        path: [
          { x: midway + A / 2, y: midway - A / 2 },
          { x: midway + A / 2, y: midway - A_sqrt_two_by_2 / 4 },
          { x: midway + A_sqrt_two_by_2 / 4, y: midway - A_sqrt_two_by_2 / 4 },
          { x: midway + A_sqrt_two_by_2 / 4, y: midway - A / 2 },
        ],
      },
      {
        id: ARROW_LOWER_LEFT_ONE,
        colors: {
          regular: this.pattern_color(17, REGULAR_SAT_PCT, LUMINOSITY_ONE_PCT),
          hover: this.pattern_color(17, HOVER_SAT_PCT, LUMINOSITY_ONE_PCT),
          click: this.pattern_color(17, CLICK_SAT_PCT, LUMINOSITY_ONE_PCT),
        },
        path: [
          { x: midway - A / 2, y: midway + A / 2 },
          { x: midway - A_sqrt_two_by_2 / 4, y: midway + A / 2 },
          { x: midway - A_sqrt_two_by_2 / 4, y: midway + A_sqrt_two_by_2 / 4 },
          { x: midway - A / 2, y: midway + A_sqrt_two_by_2 / 4 },
        ],
      },
      {
        id: ARROW_LOWER_RIGHT_ONE,
        colors: {
          regular: this.pattern_color(17, REGULAR_SAT_PCT, LUMINOSITY_ONE_PCT),
          hover: this.pattern_color(17, HOVER_SAT_PCT, LUMINOSITY_ONE_PCT),
          click: this.pattern_color(17, CLICK_SAT_PCT, LUMINOSITY_ONE_PCT),
        },
        path: [
          { x: midway + A / 2, y: midway + A / 2 },
          { x: midway + A / 2, y: midway + A_sqrt_two_by_2 / 4 },
          { x: midway + A_sqrt_two_by_2 / 4, y: midway + A_sqrt_two_by_2 / 4 },
          { x: midway + A_sqrt_two_by_2 / 4, y: midway + A / 2 },
        ],
      },
      {
        id: ARROW_UPPER_LEFT_THREE,
        colors: {
          regular: this.pattern_color(
            17,
            REGULAR_SAT_PCT,
            LUMINOSITY_THREE_PCT,
          ),
          hover: this.pattern_color(17, HOVER_SAT_PCT, LUMINOSITY_THREE_PCT),
          click: this.pattern_color(17, CLICK_SAT_PCT, LUMINOSITY_THREE_PCT),
        },
        path: [
          { x: 0, y: 0 },
          { x: A_sqrt_two_by_2, y: 0 },
          { x: A_sqrt_two_by_2, y: A_sqrt_two_by_2 / 2 },
          { x: A_sqrt_two_by_2 / 2, y: A_sqrt_two_by_2 / 2 },
          { x: A_sqrt_two_by_2 / 2, y: A_sqrt_two_by_2 },
          { x: 0, y: A_sqrt_two_by_2 },
        ],
      },
      {
        id: ARROW_UPPER_RIGHT_THREE,
        colors: {
          regular: this.pattern_color(
            17,
            REGULAR_SAT_PCT,
            LUMINOSITY_THREE_PCT,
          ),
          hover: this.pattern_color(17, HOVER_SAT_PCT, LUMINOSITY_THREE_PCT),
          click: this.pattern_color(17, CLICK_SAT_PCT, LUMINOSITY_THREE_PCT),
        },
        path: [
          { x: canvas_measure_px, y: 0 },
          { x: canvas_measure_px - A_sqrt_two_by_2, y: 0 },
          { x: canvas_measure_px - A_sqrt_two_by_2, y: A_sqrt_two_by_2 / 2 },
          {
            x: canvas_measure_px - A_sqrt_two_by_2 / 2,
            y: A_sqrt_two_by_2 / 2,
          },
          { x: canvas_measure_px - A_sqrt_two_by_2 / 2, y: A_sqrt_two_by_2 },
          { x: canvas_measure_px, y: A_sqrt_two_by_2 },
        ],
      },
      {
        id: ARROW_LOWER_LEFT_THREE,
        colors: {
          regular: this.pattern_color(
            17,
            REGULAR_SAT_PCT,
            LUMINOSITY_THREE_PCT,
          ),
          hover: this.pattern_color(17, HOVER_SAT_PCT, LUMINOSITY_THREE_PCT),
          click: this.pattern_color(17, CLICK_SAT_PCT, LUMINOSITY_THREE_PCT),
        },
        path: [
          { x: 0, y: canvas_measure_px },
          { x: A_sqrt_two_by_2, y: canvas_measure_px },
          { x: A_sqrt_two_by_2, y: canvas_measure_px - A_sqrt_two_by_2 / 2 },
          {
            x: A_sqrt_two_by_2 / 2,
            y: canvas_measure_px - A_sqrt_two_by_2 / 2,
          },
          { x: A_sqrt_two_by_2 / 2, y: canvas_measure_px - A_sqrt_two_by_2 },
          { x: 0, y: canvas_measure_px - A_sqrt_two_by_2 },
        ],
      },
      {
        id: ARROW_LOWER_RIGHT_THREE,
        colors: {
          regular: this.pattern_color(
            17,
            REGULAR_SAT_PCT,
            LUMINOSITY_THREE_PCT,
          ),
          hover: this.pattern_color(17, HOVER_SAT_PCT, LUMINOSITY_THREE_PCT),
          click: this.pattern_color(17, CLICK_SAT_PCT, LUMINOSITY_THREE_PCT),
        },
        path: [
          { x: canvas_measure_px, y: canvas_measure_px },
          { x: canvas_measure_px - A_sqrt_two_by_2, y: canvas_measure_px },
          {
            x: canvas_measure_px - A_sqrt_two_by_2,
            y: canvas_measure_px - A_sqrt_two_by_2 / 2,
          },
          {
            x: canvas_measure_px - A_sqrt_two_by_2 / 2,
            y: canvas_measure_px - A_sqrt_two_by_2 / 2,
          },
          {
            x: canvas_measure_px - A_sqrt_two_by_2 / 2,
            y: canvas_measure_px - A_sqrt_two_by_2,
          },
          { x: canvas_measure_px, y: canvas_measure_px - A_sqrt_two_by_2 },
        ],
      },
      {
        id: ARROW_UPPER_LEFT_TWO,
        colors: {
          regular: this.pattern_color(17, REGULAR_SAT_PCT, LUMINOSITY_TWO_PCT),
          hover: this.pattern_color(17, HOVER_SAT_PCT, LUMINOSITY_TWO_PCT),
          click: this.pattern_color(17, CLICK_SAT_PCT, LUMINOSITY_TWO_PCT),
        },
        path: [
          { x: A_sqrt_two_by_2, y: A_sqrt_two_by_2 / 2 },
          { x: A_sqrt_two_by_2 / 2, y: A_sqrt_two_by_2 / 2 },
          { x: A_sqrt_two_by_2 / 2, y: A_sqrt_two_by_2 },
          { x: midway - A / 2, y: midway - A_sqrt_two_by_2 / 4 },
          { x: midway - A / 2, y: midway - A / 2 },
          { x: midway - A_sqrt_two_by_2 / 4, y: midway - A / 2 },
        ],
      },
      {
        id: ARROW_UPPER_RIGHT_TWO,
        colors: {
          regular: this.pattern_color(17, REGULAR_SAT_PCT, LUMINOSITY_TWO_PCT),
          hover: this.pattern_color(17, HOVER_SAT_PCT, LUMINOSITY_TWO_PCT),
          click: this.pattern_color(17, CLICK_SAT_PCT, LUMINOSITY_TWO_PCT),
        },
        path: [
          { x: canvas_measure_px - A_sqrt_two_by_2, y: A_sqrt_two_by_2 / 2 },
          {
            x: canvas_measure_px - A_sqrt_two_by_2 / 2,
            y: A_sqrt_two_by_2 / 2,
          },
          { x: canvas_measure_px - A_sqrt_two_by_2 / 2, y: A_sqrt_two_by_2 },
          {
            x: canvas_measure_px - (midway - A / 2),
            y: midway - A_sqrt_two_by_2 / 4,
          },
          { x: canvas_measure_px - (midway - A / 2), y: midway - A / 2 },
          {
            x: canvas_measure_px - (midway - A_sqrt_two_by_2 / 4),
            y: midway - A / 2,
          },
        ],
      },
      {
        id: ARROW_LOWER_LEFT_TWO,
        colors: {
          regular: this.pattern_color(17, REGULAR_SAT_PCT, LUMINOSITY_TWO_PCT),
          hover: this.pattern_color(17, HOVER_SAT_PCT, LUMINOSITY_TWO_PCT),
          click: this.pattern_color(17, CLICK_SAT_PCT, LUMINOSITY_TWO_PCT),
        },
        path: [
          { x: A_sqrt_two_by_2, y: canvas_measure_px - A_sqrt_two_by_2 / 2 },
          {
            x: A_sqrt_two_by_2 / 2,
            y: canvas_measure_px - A_sqrt_two_by_2 / 2,
          },
          { x: A_sqrt_two_by_2 / 2, y: canvas_measure_px - A_sqrt_two_by_2 },
          {
            x: midway - A / 2,
            y: canvas_measure_px - (midway - A_sqrt_two_by_2 / 4),
          },
          { x: midway - A / 2, y: canvas_measure_px - (midway - A / 2) },
          {
            x: midway - A_sqrt_two_by_2 / 4,
            y: canvas_measure_px - (midway - A / 2),
          },
        ],
      },
      {
        id: ARROW_LOWER_RIGHT_TWO,
        colors: {
          regular: this.pattern_color(17, REGULAR_SAT_PCT, LUMINOSITY_TWO_PCT),
          hover: this.pattern_color(17, HOVER_SAT_PCT, LUMINOSITY_TWO_PCT),
          click: this.pattern_color(17, CLICK_SAT_PCT, LUMINOSITY_TWO_PCT),
        },
        path: [
          {
            x: canvas_measure_px - A_sqrt_two_by_2,
            y: canvas_measure_px - A_sqrt_two_by_2 / 2,
          },
          {
            x: canvas_measure_px - A_sqrt_two_by_2 / 2,
            y: canvas_measure_px - A_sqrt_two_by_2 / 2,
          },
          {
            x: canvas_measure_px - A_sqrt_two_by_2 / 2,
            y: canvas_measure_px - A_sqrt_two_by_2,
          },
          {
            x: canvas_measure_px - (midway - A / 2),
            y: canvas_measure_px - (midway - A_sqrt_two_by_2 / 4),
          },
          {
            x: canvas_measure_px - (midway - A / 2),
            y: canvas_measure_px - (midway - A / 2),
          },
          {
            x: canvas_measure_px - (midway - A_sqrt_two_by_2 / 4),
            y: canvas_measure_px - (midway - A / 2),
          },
        ],
      },
      {
        id: ARROW_UP_TWO,
        colors: {
          regular: this.pattern_color(1, REGULAR_SAT_PCT, LUMINOSITY_TWO_PCT),
          hover: this.pattern_color(1, HOVER_SAT_PCT, LUMINOSITY_TWO_PCT),
          click: this.pattern_color(1, CLICK_SAT_PCT, LUMINOSITY_TWO_PCT),
        },
        path: [
          { x: midway - A_sqrt_two_by_2 / 4, y: midway - A / 2 },
          { x: midway + A_sqrt_two_by_2 / 4, y: midway - A / 2 },
          { x: canvas_measure_px - A_sqrt_two_by_2, y: A_sqrt_two_by_2 / 2 },
          { x: A_sqrt_two_by_2, y: A_sqrt_two_by_2 / 2 },
        ],
      },
      {
        id: ARROW_DOWN_TWO,
        colors: {
          regular: this.pattern_color(5, REGULAR_SAT_PCT, LUMINOSITY_TWO_PCT),
          hover: this.pattern_color(5, HOVER_SAT_PCT, LUMINOSITY_TWO_PCT),
          click: this.pattern_color(5, CLICK_SAT_PCT, LUMINOSITY_TWO_PCT),
        },
        path: [
          { x: midway - A_sqrt_two_by_2 / 4, y: midway + A / 2 },
          { x: midway + A_sqrt_two_by_2 / 4, y: midway + A / 2 },
          {
            x: canvas_measure_px - A_sqrt_two_by_2,
            y: canvas_measure_px - A_sqrt_two_by_2 / 2,
          },
          { x: A_sqrt_two_by_2, y: canvas_measure_px - A_sqrt_two_by_2 / 2 },
        ],
      },
      {
        id: ARROW_RIGHT_TWO,
        colors: {
          regular: this.pattern_color(3, REGULAR_SAT_PCT, LUMINOSITY_TWO_PCT),
          hover: this.pattern_color(3, HOVER_SAT_PCT, LUMINOSITY_TWO_PCT),
          click: this.pattern_color(3, CLICK_SAT_PCT, LUMINOSITY_TWO_PCT),
        },
        path: [
          { x: midway + A / 2, y: midway - A_sqrt_two_by_2 / 4 },
          { x: midway + A / 2, y: midway + A_sqrt_two_by_2 / 4 },
          {
            x: canvas_measure_px - A_sqrt_two_by_2 / 2,
            y: canvas_measure_px - A_sqrt_two_by_2,
          },
          { x: canvas_measure_px - A_sqrt_two_by_2 / 2, y: A_sqrt_two_by_2 },
        ],
      },
      {
        id: ARROW_LEFT_TWO,
        colors: {
          regular: this.pattern_color(7, REGULAR_SAT_PCT, LUMINOSITY_TWO_PCT),
          hover: this.pattern_color(7, HOVER_SAT_PCT, LUMINOSITY_TWO_PCT),
          click: this.pattern_color(7, CLICK_SAT_PCT, LUMINOSITY_TWO_PCT),
        },
        path: [
          { x: midway - A / 2, y: midway - A_sqrt_two_by_2 / 4 },
          { x: midway - A / 2, y: midway + A_sqrt_two_by_2 / 4 },
          { x: A_sqrt_two_by_2 / 2, y: canvas_measure_px - A_sqrt_two_by_2 },
          { x: A_sqrt_two_by_2 / 2, y: A_sqrt_two_by_2 },
        ],
      },
      {
        id: ARROW_UP_THREE,
        colors: {
          regular: this.pattern_color(1, REGULAR_SAT_PCT, LUMINOSITY_THREE_PCT),
          hover: this.pattern_color(1, HOVER_SAT_PCT, LUMINOSITY_THREE_PCT),
          click: this.pattern_color(1, CLICK_SAT_PCT, LUMINOSITY_THREE_PCT),
        },
        path: [
          { x: A_sqrt_two_by_2, y: A_sqrt_two_by_2 / 2 },
          { x: canvas_measure_px - A_sqrt_two_by_2, y: A_sqrt_two_by_2 / 2 },
          { x: canvas_measure_px - A_sqrt_two_by_2, y: 0 },
          { x: A_sqrt_two_by_2, y: 0 },
        ],
      },
      {
        id: ARROW_DOWN_THREE,
        colors: {
          regular: this.pattern_color(5, REGULAR_SAT_PCT, LUMINOSITY_THREE_PCT),
          hover: this.pattern_color(5, HOVER_SAT_PCT, LUMINOSITY_THREE_PCT),
          click: this.pattern_color(5, CLICK_SAT_PCT, LUMINOSITY_THREE_PCT),
        },
        path: [
          { x: A_sqrt_two_by_2, y: canvas_measure_px - A_sqrt_two_by_2 / 2 },
          {
            x: canvas_measure_px - A_sqrt_two_by_2,
            y: canvas_measure_px - A_sqrt_two_by_2 / 2,
          },
          { x: canvas_measure_px - A_sqrt_two_by_2, y: canvas_measure_px },
          { x: A_sqrt_two_by_2, y: canvas_measure_px },
        ],
      },
      {
        id: ARROW_RIGHT_THREE,
        colors: {
          regular: this.pattern_color(3, REGULAR_SAT_PCT, LUMINOSITY_THREE_PCT),
          hover: this.pattern_color(3, HOVER_SAT_PCT, LUMINOSITY_THREE_PCT),
          click: this.pattern_color(3, CLICK_SAT_PCT, LUMINOSITY_THREE_PCT),
        },
        path: [
          { x: canvas_measure_px, y: A_sqrt_two_by_2 },
          { x: canvas_measure_px, y: canvas_measure_px - A_sqrt_two_by_2 },
          {
            x: canvas_measure_px - A_sqrt_two_by_2 / 2,
            y: canvas_measure_px - A_sqrt_two_by_2,
          },
          { x: canvas_measure_px - A_sqrt_two_by_2 / 2, y: A_sqrt_two_by_2 },
        ],
      },
      {
        id: ARROW_LEFT_THREE,
        colors: {
          regular: this.pattern_color(7, REGULAR_SAT_PCT, LUMINOSITY_THREE_PCT),
          hover: this.pattern_color(7, HOVER_SAT_PCT, LUMINOSITY_THREE_PCT),
          click: this.pattern_color(7, CLICK_SAT_PCT, LUMINOSITY_THREE_PCT),
        },
        path: [
          { x: 0, y: A_sqrt_two_by_2 },
          { x: 0, y: canvas_measure_px - A_sqrt_two_by_2 },
          { x: A_sqrt_two_by_2 / 2, y: canvas_measure_px - A_sqrt_two_by_2 },
          { x: A_sqrt_two_by_2 / 2, y: A_sqrt_two_by_2 },
        ],
      },
    ];
    return NavigatorTransit.all_regions;
  };

  draw_paths = () => {
    const { ctx, in_hover, in_click } = this.state;
    if (!ctx) {
      return;
    }
    const regions = this.make_regions();
    regions.forEach((region) => {
      ctx.beginPath();
      const canvas_x0 = region.path[0].x;
      const canvas_y0 = region.path[0].y;
      ctx.moveTo(canvas_x0, canvas_y0);
      for (
        let point_index = 1;
        point_index < region.path.length;
        point_index++
      ) {
        const canvas_x = region.path[point_index].x;
        const canvas_y = region.path[point_index].y;
        ctx.lineTo(canvas_x, canvas_y);
      }
      ctx.lineTo(canvas_x0, canvas_y0);
      ctx.closePath();
      if (in_hover === region.id) {
        ctx.fillStyle = region.colors.hover;
      } else if (in_click === region.id) {
        ctx.fillStyle = region.colors.click;
      } else {
        ctx.fillStyle = region.colors.regular;
      }
      ctx.fill();
    });
  };

  point_in_region = (e) => {
    const { canvas_ref, ctx } = this.state;
    const canvas = canvas_ref.current;
    const bounds = canvas.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    const regions = this.make_regions();
    for (let region_index = 0; region_index < regions.length; region_index++) {
      const region = regions[region_index];
      ctx.beginPath();
      const canvas_x0 = region.path[0].x;
      const canvas_y0 = region.path[0].y;
      ctx.moveTo(canvas_x0, canvas_y0);
      for (
        let point_index = 1;
        point_index < region.path.length;
        point_index++
      ) {
        const canvas_x = region.path[point_index].x;
        const canvas_y = region.path[point_index].y;
        ctx.lineTo(canvas_x, canvas_y);
      }
      ctx.lineTo(canvas_x0, canvas_y0);
      ctx.closePath();
      if (ctx.isPointInPath(x, y)) {
        return region;
      }
    }
    return null;
  };

  on_click = (e) => {
    const { scope, focal_point, on_focal_point_changed, in_wait } = this.props;
    const region = this.point_in_region(e);
    if (!region || in_wait) {
      return;
    }
    switch (region.id) {
      case ARROW_UP_ONE:
        on_focal_point_changed({
          x: focal_point.x,
          y: focal_point.y + scope * ONE_DOT_FACTOR,
        });
        break;
      case ARROW_RIGHT_ONE:
        on_focal_point_changed({
          x: focal_point.x + scope * ONE_DOT_FACTOR,
          y: focal_point.y,
        });
        break;
      case ARROW_DOWN_ONE:
        on_focal_point_changed({
          x: focal_point.x,
          y: focal_point.y - scope * ONE_DOT_FACTOR,
        });
        break;
      case ARROW_LEFT_ONE:
        on_focal_point_changed({
          x: focal_point.x - scope * ONE_DOT_FACTOR,
          y: focal_point.y,
        });
        break;
      case ARROW_UP_TWO:
        on_focal_point_changed({
          x: focal_point.x,
          y: focal_point.y + scope * TWO_DOT_FACTOR,
        });
        break;
      case ARROW_RIGHT_TWO:
        on_focal_point_changed({
          x: focal_point.x + scope * TWO_DOT_FACTOR,
          y: focal_point.y,
        });
        break;
      case ARROW_DOWN_TWO:
        on_focal_point_changed({
          x: focal_point.x,
          y: focal_point.y - scope * TWO_DOT_FACTOR,
        });
        break;
      case ARROW_LEFT_TWO:
        on_focal_point_changed({
          x: focal_point.x - scope * TWO_DOT_FACTOR,
          y: focal_point.y,
        });
        break;
      case ARROW_UPPER_LEFT_ONE:
        on_focal_point_changed({
          x: focal_point.x - scope * ONE_DOT_FACTOR,
          y: focal_point.y + scope * ONE_DOT_FACTOR,
        });
        break;
      case ARROW_UPPER_RIGHT_ONE:
        on_focal_point_changed({
          x: focal_point.x + scope * ONE_DOT_FACTOR,
          y: focal_point.y + scope * ONE_DOT_FACTOR,
        });
        break;
      case ARROW_LOWER_LEFT_ONE:
        on_focal_point_changed({
          x: focal_point.x - scope * ONE_DOT_FACTOR,
          y: focal_point.y - scope * ONE_DOT_FACTOR,
        });
        break;
      case ARROW_LOWER_RIGHT_ONE:
        on_focal_point_changed({
          x: focal_point.x + scope * ONE_DOT_FACTOR,
          y: focal_point.y - scope * ONE_DOT_FACTOR,
        });
        break;
      case ARROW_UPPER_LEFT_TWO:
        on_focal_point_changed({
          x: focal_point.x - scope * TWO_DOT_FACTOR,
          y: focal_point.y + scope * TWO_DOT_FACTOR,
        });
        break;
      case ARROW_UPPER_RIGHT_TWO:
        on_focal_point_changed({
          x: focal_point.x + scope * TWO_DOT_FACTOR,
          y: focal_point.y + scope * TWO_DOT_FACTOR,
        });
        break;
      case ARROW_LOWER_LEFT_TWO:
        on_focal_point_changed({
          x: focal_point.x - scope * TWO_DOT_FACTOR,
          y: focal_point.y - scope * TWO_DOT_FACTOR,
        });
        break;
      case ARROW_LOWER_RIGHT_TWO:
        on_focal_point_changed({
          x: focal_point.x + scope * TWO_DOT_FACTOR,
          y: focal_point.y - scope * TWO_DOT_FACTOR,
        });
        break;
      case ARROW_UPPER_LEFT_THREE:
        on_focal_point_changed({
          x: focal_point.x - scope * THREE_DOT_FACTOR,
          y: focal_point.y + scope * THREE_DOT_FACTOR,
        });
        break;
      case ARROW_UPPER_RIGHT_THREE:
        on_focal_point_changed({
          x: focal_point.x + scope * THREE_DOT_FACTOR,
          y: focal_point.y + scope * THREE_DOT_FACTOR,
        });
        break;
      case ARROW_LOWER_LEFT_THREE:
        on_focal_point_changed({
          x: focal_point.x - scope * THREE_DOT_FACTOR,
          y: focal_point.y - scope * THREE_DOT_FACTOR,
        });
        break;
      case ARROW_LOWER_RIGHT_THREE:
        on_focal_point_changed({
          x: focal_point.x + scope * THREE_DOT_FACTOR,
          y: focal_point.y - scope * THREE_DOT_FACTOR,
        });
        break;
      case ARROW_UP_THREE:
        on_focal_point_changed({
          x: focal_point.x,
          y: focal_point.y + scope * THREE_DOT_FACTOR,
        });
        break;
      case ARROW_RIGHT_THREE:
        on_focal_point_changed({
          x: focal_point.x + scope * THREE_DOT_FACTOR,
          y: focal_point.y,
        });
        break;
      case ARROW_LEFT_THREE:
        on_focal_point_changed({
          x: focal_point.x - scope * THREE_DOT_FACTOR,
          y: focal_point.y,
        });
        break;
      case ARROW_DOWN_THREE:
        on_focal_point_changed({
          x: focal_point.x,
          y: focal_point.y - scope * THREE_DOT_FACTOR,
        });
        break;
      default:
        break;
    }
  };

  on_mousemove = (e) => {
    const region = this.point_in_region(e);
    if (!region) {
      return;
    }
    this.setState({ in_hover: region.id });
  };

  on_mouseleave = () => {
    this.setState({ in_hover: null });
  };

  render() {
    const { width_px, in_wait } = this.props;
    const { canvas_ref } = this.state;
    const canvas_style = {
      cursor: in_wait ? "wait" : "pointer",
      borderRadius: `${width_px / CURVED_CORNERS_FACTOR}px`,
    };
    let icon = [];
    if (in_wait) {
      const icon_style = {
        left: width_px / 2 - WAIT_ICON_SIZE_PX / 2,
        top: width_px / 2 - WAIT_ICON_SIZE_PX / 2 + 36,
      };
      icon = (
        <WaitIconWrapper style={icon_style}>
          {NavigatorTransit.is_wait_icon_2 ? wait_icon : wait_icon_2}
        </WaitIconWrapper>
      );
      NavigatorTransit.is_wait_icon_2 = !NavigatorTransit.is_wait_icon_2;
    }
    return (
      <CanvasWrapper
        onClick={this.on_click}
        onMouseMove={this.on_mousemove}
        onMouseLeave={this.on_mouseleave}
      >
        <CanvasSubstrate
          ref={canvas_ref}
          key={"canvas"}
          style={canvas_style}
          width={width_px - 2 * TRANSIT_PADDING_PX}
          height={width_px * 1.0 - 2 * TRANSIT_PADDING_PX}
        />
        {icon}
      </CanvasWrapper>
    );
  }
}

export default NavigatorTransit;
