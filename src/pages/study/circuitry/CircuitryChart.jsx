import React, { Component } from "react";
import PropTypes from "prop-types";

import { Chart as ChartJS, registerables } from "chart.js";
ChartJS.register(...registerables);

import { MainStyles as styles } from "../../../styles/MainStyles.jsx";
import DataBackend from "../../../backend/DataBackend.jsx";
import AppText from "../../../AppText.jsx";
import {
  KEY_STUDY_CIRCUITRY_NO_ORBITAL,
  KEY_STUDY_CIRCUITRY_RADIAL_SWEEP,
  KEY_STUDY_CIRCUITRY_ORBITAL_COORDINATES,
} from "../../../text/StudyText.jsx";
import { render_coordinates } from "../../../utils/Dom.jsx";
import { click_point_chart } from "../../../utils/render/PatternsUtils.jsx";
import {
  CELL_LABEL_STYLE,
  CELL_TYPE_CALLBACK,
  TABLE_CAN_SELECT,
  TABLE_NO_BORDER,
  TABLE_NO_HEADER,
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import { IMAGE_FRAME_STYLE } from "../../../utils/ui/styles/CoolStyles.jsx";
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import CoolMediaTransport, {
  TRANSPORT_BEGIN,
  TRANSPORT_END,
  TRANSPORT_PAUSE,
  TRANSPORT_PLAY,
  TRANSPORT_REVERSE,
} from "../../../utils/ui/CoolMediaTransport.jsx";

const TRANSPORT_OPERATIONS = [
  TRANSPORT_BEGIN,
  TRANSPORT_REVERSE,
  TRANSPORT_PAUSE,
  TRANSPORT_PLAY,
  TRANSPORT_END,
];
const PATH_ANIMATION_RATE_FPS = 20;
const GOLDEN_RATIO = 1.618;
const ORBITAL_POINT_COLUMNS = [
  {
    id: "coordinates",
    label_key: KEY_STUDY_CIRCUITRY_ORBITAL_COORDINATES,
    type: CELL_TYPE_CALLBACK,
  },
];

export class CircuitryChart extends Component {
  static propTypes = {
    focal_point: PropTypes.object,
    height_px: PropTypes.number.isRequired,
    width_px: PropTypes.number.isRequired,
  };

  state = {
    circuitry_data: null,
    error: null,
    radial_sweep: true,
    animation_index: 0,
    selected_orbital_row: -1,
    selected_orbital_point: null,
    animation_playing: false,
    animation_timer: null,
  };

  componentDidMount() {
    if (this.has_focal_point(this.props.focal_point)) {
      this.load_circuitry(this.props.focal_point);
    }
  }

  componentDidUpdate(prevProps, prevState) {
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
      return;
    }
    if (prevState.radial_sweep !== this.state.radial_sweep) {
      this.load_circuitry(focal_point);
    }
  }

  componentWillUnmount() {
    if (this.state.animation_timer) {
      clearInterval(this.state.animation_timer);
    }
  }

  has_focal_point = (focal_point) =>
    focal_point &&
    Number.isFinite(Number(focal_point.x)) &&
    Number.isFinite(Number(focal_point.y));

  load_circuitry = (focal_point) => {
    DataBackend.get_circuitry(
      focal_point,
      (response) => {
        if (response.error) {
          this.setState({ error: response.error });
          return;
        }
        this.setState({
          circuitry_data: response,
          error: null,
          animation_index: 0,
          selected_orbital_row: -1,
          selected_orbital_point: null,
        });
      },
      true,
      this.state.radial_sweep ? "radial_sweep" : "hermite",
    );
  };

  on_radial_sweep_changed = (event) => {
    this.setState({ radial_sweep: event.target.checked });
  };

  on_orbital_point_selected = (row) => {
    const orbital_point = this.state.circuitry_data?.orbital_points?.[row];
    const samples = this.state.circuitry_data?.result || [];
    if (!orbital_point || samples.length === 0) {
      return;
    }
    let nearest_index = 0;
    let nearest_distance = Number.POSITIVE_INFINITY;
    samples.forEach(({ C }, index) => {
      const distance =
        (C.re - orbital_point.re) ** 2 + (C.im - orbital_point.im) ** 2;
      if (distance < nearest_distance) {
        nearest_distance = distance;
        nearest_index = index;
      }
    });
    this.setState({
      animation_index: nearest_index,
      selected_orbital_row: row,
      // Keep the exact orbital point for the marker. The sampled curve is
      // intentionally discrete, so replacing this with the nearest sample
      // makes a table click appear to land noticeably ahead of the target.
      selected_orbital_point: {
        x: orbital_point.re,
        y: orbital_point.im,
      },
    });
  };

  clear_animation_timer = () => {
    if (this.state.animation_timer) {
      clearInterval(this.state.animation_timer);
    }
    this.setState({ animation_timer: null });
  };

  advance_animation = (direction) => {
    const point_count = this.state.circuitry_data?.result?.length || 0;
    if (point_count === 0) return;
    let next_index = this.state.animation_index + direction;
    if (next_index >= point_count) next_index = 0;
    if (next_index < 0) next_index = point_count - 1;
    this.setState({ animation_index: next_index });
  };

  start_animation = (direction) => {
    this.clear_animation_timer();
    const animation_timer = setInterval(
      () => this.advance_animation(direction),
      1000 / PATH_ANIMATION_RATE_FPS,
    );
    this.setState({
      animation_direction: direction,
      animation_playing: true,
      animation_timer,
      selected_orbital_point: null,
    });
  };

  on_transport_operation = (operation) => {
    if (operation === TRANSPORT_BEGIN) {
      this.clear_animation_timer();
      this.setState({
        animation_index: 0,
        animation_playing: false,
        selected_orbital_point: null,
      });
    }
    if (operation === TRANSPORT_END) {
      this.clear_animation_timer();
      const point_count = this.state.circuitry_data?.result?.length || 1;
      this.setState({
        animation_index: point_count - 1,
        animation_playing: false,
        selected_orbital_point: null,
      });
    }
    if (operation === TRANSPORT_PLAY) this.start_animation(1);
    if (operation === TRANSPORT_REVERSE) this.start_animation(-1);
    if (operation === TRANSPORT_PAUSE) {
      this.clear_animation_timer();
      this.setState({ animation_playing: false });
    }
  };

  render() {
    const { width_px, height_px } = this.props;
    const {
      circuitry_data,
      error,
      radial_sweep,
      animation_index,
      selected_orbital_row,
      selected_orbital_point,
    } = this.state;
    const chart_size = Math.floor(
      Math.max(0, Math.min(width_px, height_px)) * 0.85,
    );
    const points = (circuitry_data?.result || []).map(({ C }) => ({
      x: C.re,
      y: C.im,
    }));
    const orbital_table_data = (circuitry_data?.orbital_points || []).map(
      (point) => ({
        coordinates: [render_coordinates, { x: point.re, y: point.im }],
      }),
    );
    const no_orbital =
      circuitry_data?.orbit_status === "outside_mandelbrot_set";
    const orbital_points = (circuitry_data?.result || [])
      .filter(({ t }, index) =>
        radial_sweep ? index % 50 === 0 : Math.abs(t - Math.round(t)) < 1e-9,
      )
      .map(({ C }) => ({
        x: C.re,
        y: C.im,
      }));
    const radial_origin = circuitry_data?.Q
      ? { x: circuitry_data.Q.re, y: circuitry_data.Q.im }
      : null;
    const highlighted_point =
      selected_orbital_point || points[animation_index] || null;
    const chart_style = {
      ...IMAGE_FRAME_STYLE,
      width: `${chart_size}px`,
      height: `${chart_size}px`,
      display: "inline-block",
      margin: "0.5rem",
      backgroundColor: no_orbital ? "#eeeeee" : undefined,
      position: no_orbital ? "relative" : undefined,
    };
    const no_orbital_message_style = {
      position: "absolute",
      top: `${(1 - 1 / GOLDEN_RATIO) * 100}%`,
      left: "0",
      width: "100%",
      transform: "translateY(-50%)",
      color: "#999999",
      fontStyle: "italic",
      fontSize: "1.125rem",
      textAlign: "center",
    };
    const options_width = Math.max(0, width_px - chart_size);
    const options_style = {
      width: `${options_width}px`,
      height: `${chart_size}px`,
      verticalAlign: "top",
      overflow: "auto",
      textAlign: "left",
    };
    return (
      <>
        <styles.ContentWrapper style={chart_style}>
          {error ? (
            error
          ) : no_orbital ? (
            <span style={no_orbital_message_style}>
              {AppText.get(KEY_STUDY_CIRCUITRY_NO_ORBITAL)}
            </span>
          ) : points.length > 0 ? (
            click_point_chart(
              points,
              orbital_points,
              false,
              false,
              null,
              "#888888",
              false,
              4,
              radial_origin,
              highlighted_point,
            )
          ) : null}
        </styles.ContentWrapper>
        <styles.ContentWrapper style={options_style}>
          <CoolMediaTransport
            width_px={Math.max(options_width, 100)}
            button_size_px={35}
            operations={TRANSPORT_OPERATIONS}
            on_operation={this.on_transport_operation}
            disabled={points.length === 0}
          />
          <div style={{ marginTop: "0.5rem" }}>
            <CoolTable
              columns={ORBITAL_POINT_COLUMNS}
              data={orbital_table_data}
              on_select_row={this.on_orbital_point_selected}
              options={[TABLE_CAN_SELECT, TABLE_NO_BORDER, TABLE_NO_HEADER]}
              selected_row={selected_orbital_row}
            />
          </div>
          <div style={{ display: "block", marginTop: "0.5rem" }}>
            <label>
              <input
                type="checkbox"
                checked={radial_sweep}
                onChange={this.on_radial_sweep_changed}
              />
              <span style={{ ...CELL_LABEL_STYLE, marginLeft: "0.35rem" }}>
                {AppText.get(KEY_STUDY_CIRCUITRY_RADIAL_SWEEP)}
              </span>
            </label>
          </div>
        </styles.ContentWrapper>
      </>
    );
  }
}

export default CircuitryChart;
