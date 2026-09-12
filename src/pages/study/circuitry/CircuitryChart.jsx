import React, { Component } from "react";
import PropTypes from "prop-types";

import { MainStyles as styles } from "../../../styles/MainStyles.jsx";
import DataBackend from "../../../backend/DataBackend.jsx";
import AppText from "../../../AppText.jsx";
import AppSettings from "../../../AppSettings.jsx";
import { render_pattern_block } from "../StudyUtils.jsx";
import {
  KEY_STUDY_CIRCUITRY_NO_ORBITAL,
  KEY_STUDY_CIRCUITRY_RADIAL_SWEEP,
  KEY_STUDY_CIRCUITRY_ORBITAL_COORDINATES,
  KEY_STUDY_CIRCUITRY_ORBITAL_DESCRIPTION,
  KEY_STUDY_CIRCUITRY_ORBITAL_PROGRESS,
  KEY_STUDY_CIRCUITRY_CLOCKWISE,
  KEY_STUDY_CIRCUITRY_COUNTER_CLOCKWISE,
  KEY_STUDY_MAGNITUDE,
  KEY_STUDY_CIRCUITRY_DETECTED_IN,
} from "../../../text/StudyText.jsx";
import { KEY_STUDY_CIRCUITRY_ANIMATION_SPEED } from "../../../settings/StudySettings.jsx";
import { render_coordinates } from "../../../utils/Dom.jsx";
import { click_point_chart } from "../../../utils/render/PatternsUtils.jsx";
import {
  CELL_LABEL_STYLE,
  CELL_TYPE_CALLBACK,
  TABLE_CAN_SELECT,
  TABLE_NO_BORDER,
  TABLE_NO_HEADER,
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import { IMAGE_FRAME_STYLE } from "../../../utils/render/ImageFrameStyle.jsx";
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import CoolMediaTransport, {
  TRANSPORT_BEGIN,
  TRANSPORT_END,
  TRANSPORT_PAUSE,
  TRANSPORT_PLAY,
  TRANSPORT_REVERSE,
} from "../../../utils/ui/CoolMediaTransport.jsx";
import CoolSlider from "../../../utils/ui/CoolSlider.jsx";

const TRANSPORT_OPERATIONS = [
  TRANSPORT_BEGIN,
  TRANSPORT_REVERSE,
  TRANSPORT_PAUSE,
  TRANSPORT_PLAY,
  TRANSPORT_END,
];
const TRANSPORT_BUTTON_SIZE_PX = 35;
const SPEED_SLIDER_WIDTH_PX = TRANSPORT_BUTTON_SIZE_PX * 5;
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
    animation_speed:
      Number(AppSettings.get(KEY_STUDY_CIRCUITRY_ANIMATION_SPEED)) || 1,
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

  get_animation_orbital_row = (t) => {
    const orbital_points = this.state.circuitry_data?.orbital_points || [];
    const samples = this.state.circuitry_data?.result || [];
    if (
      !Number.isFinite(t) ||
      orbital_points.length === 0 ||
      samples.length === 0
    ) {
      return -1;
    }
    const radial = this.state.radial_sweep;
    // Radial-sweep samples include both endpoints, so the number of samples
    // per orbital interval is based on the number of intervals (one fewer
    // than the point count). This keeps the t mapping exact at every point,
    // including the closing point.
    const interval_width =
      radial && orbital_points.length > 1
        ? (samples.length - 1) / (orbital_points.length - 1)
        : 1;
    const orbital_t = orbital_points.map((_, row) =>
      radial ? samples[Math.round(row * interval_width)]?.t : row,
    );
    if (orbital_t.some((value) => !Number.isFinite(value))) return -1;
    let nearest_row = -1;
    let nearest_delta = Number.POSITIVE_INFINITY;
    orbital_t.forEach((target_t, row) => {
      const delta = Math.abs(t - target_t);
      if (delta < nearest_delta) {
        nearest_delta = delta;
        nearest_row = row;
      }
    });
    const previous_gap =
      nearest_row > 0
        ? Math.abs(orbital_t[nearest_row] - orbital_t[nearest_row - 1])
        : Number.POSITIVE_INFINITY;
    const next_gap =
      nearest_row < orbital_t.length - 1
        ? Math.abs(orbital_t[nearest_row + 1] - orbital_t[nearest_row])
        : Number.POSITIVE_INFINITY;
    const threshold = Math.min(previous_gap, next_gap) / 2;
    return nearest_delta <= threshold ? nearest_row : -1;
  };

  advance_animation = (direction) => {
    const point_count = this.state.circuitry_data?.result?.length || 0;
    if (point_count === 0) return;
    let next_index = this.state.animation_index + direction;
    if (next_index >= point_count) next_index = 0;
    if (next_index < 0) next_index = point_count - 1;
    const frame_t = this.state.circuitry_data?.result?.[next_index]?.t;
    const selected_orbital_row = this.get_animation_orbital_row(frame_t);
    this.setState({
      animation_index: next_index,
      selected_orbital_row,
      selected_orbital_point: null,
    });
  };

  start_animation = (direction) => {
    this.clear_animation_timer();
    const animation_timer = setInterval(
      () => this.advance_animation(direction),
      1000 / (PATH_ANIMATION_RATE_FPS * this.state.animation_speed),
    );
    this.setState({
      animation_direction: direction,
      animation_playing: true,
      animation_timer,
      selected_orbital_point: null,
    });
  };

  on_animation_speed_changed = (event, value) => {
    const animation_speed = Number(value ?? event.target.value);
    if (!Number.isFinite(animation_speed)) return;
    this.setState({ animation_speed }, () => {
      if (this.state.animation_playing) {
        this.start_animation(this.state.animation_direction || 1);
      }
    });
    AppSettings.on_settings_changed({
      [KEY_STUDY_CIRCUITRY_ANIMATION_SPEED]: animation_speed,
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
      animation_speed,
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
    const orbital_magnitude =
      circuitry_data?.Q && circuitry_data?.orbital_points?.length
        ? Math.max(
            ...circuitry_data.orbital_points.map((point) =>
              Math.hypot(
                point.re - circuitry_data.Q.re,
                point.im - circuitry_data.Q.im,
              ),
            ),
          )
        : null;
    const highlighted_point =
      selected_orbital_point || points[animation_index] || null;
    const interval_width =
      radial_sweep && orbital_points.length > 1
        ? (points.length - 1) / (orbital_points.length - 1)
        : 1;
    const orbital_t_values = circuitry_data?.orbital_points?.map((_, row) =>
      radial_sweep
        ? circuitry_data?.result?.[Math.round(row * interval_width)]?.t
        : row,
    );
    const highlighted_t = circuitry_data?.result?.[animation_index]?.t;
    const orbital_cycle_count = radial_sweep
      ? Math.max(
          1,
          Math.round(
            Math.abs(
              (circuitry_data?.result?.at(-2)?.t || 0) -
                (circuitry_data?.result?.[0]?.t || 0),
            ) /
              (2 * Math.PI),
          ),
        )
      : 1;
    const angular_delta =
      (circuitry_data?.result?.[1]?.t || 0) -
      (circuitry_data?.result?.[0]?.t || 0);
    const orbital_direction = AppText.get(
      angular_delta < 0
        ? KEY_STUDY_CIRCUITRY_CLOCKWISE
        : KEY_STUDY_CIRCUITRY_COUNTER_CLOCKWISE,
    );
    const orbital_description_template =
      AppText.get(KEY_STUDY_CIRCUITRY_ORBITAL_DESCRIPTION) || "";
    const [description_prefix, description_after_cycles = ""] =
      orbital_description_template.split("{cycles}");
    const [description_middle, description_suffix = ""] =
      description_after_cycles.split("{points}");
    const orbital_number_style = {
      color: "black",
      fontFamily: "monospace",
      fontWeight: "bold",
    };
    const orbital_text_style = {
      color: "#666666",
      fontStyle: "italic",
    };
    const orbital_progress = AppText.get(
      KEY_STUDY_CIRCUITRY_ORBITAL_PROGRESS,
    )?.replace("{direction}", orbital_direction);
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
    const controls_width = Math.max(options_width, 100);
    const options_style = {
      width: `${options_width}px`,
      height: `${chart_size}px`,
      verticalAlign: "top",
      overflow: "visible",
      textAlign: "left",
    };
    /* spectral power chart removed; diagnostics now live on detector page */
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
              0,
              selected_orbital_row,
              circuitry_data.cardinality,
              highlighted_t,
              orbital_t_values,
            )
          ) : null}
        </styles.ContentWrapper>
        <styles.ContentWrapper style={options_style}>
          {circuitry_data?.cardinality ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: "0.5rem",
              }}
            >
              {render_pattern_block(circuitry_data.cardinality, 48)}
              <span style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ lineHeight: "1rem" }}>
                  <span style={orbital_text_style}>{description_prefix}</span>
                  <span style={orbital_number_style}>
                    {orbital_cycle_count}
                  </span>
                  <span style={orbital_text_style}>{description_middle}</span>
                  <span style={orbital_number_style}>
                    {circuitry_data?.cardinality || 0}
                  </span>
                  <span style={orbital_text_style}>{description_suffix}</span>
                </span>
                {orbital_magnitude !== null ? (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      lineHeight: "0.75rem",
                      paddingLeft: "0.5rem",
                    }}
                  >
                    <span style={orbital_text_style}>of </span>
                    <span style={orbital_text_style}>
                      {AppText.get(KEY_STUDY_MAGNITUDE)}
                    </span>{" "}
                    <span style={orbital_number_style}>
                      {Math.round(orbital_magnitude * 1e9) / 1e9}
                    </span>
                  </span>
                ) : null}
                <span
                  style={{
                    fontSize: "0.75rem",
                    lineHeight: "0.75rem",
                    paddingLeft: "0.5rem",
                  }}
                >
                  {orbital_progress}
                </span>
                {Number.isFinite(circuitry_data?.detector_elapsed_ms) ? (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      lineHeight: "0.75rem",
                      paddingLeft: "0.5rem",
                    }}
                  >
                    <span style={orbital_text_style}>
                      {AppText.get(KEY_STUDY_CIRCUITRY_DETECTED_IN)}{" "}
                    </span>
                    <span style={orbital_number_style}>
                      {Math.round(circuitry_data.detector_elapsed_ms * 10) / 10}
                    </span>{" "}
                    <span style={orbital_text_style}>ms</span>
                  </span>
                ) : null}
              </span>
            </div>
          ) : null}
          <div style={{ marginTop: "0.5rem" }}>
            <CoolMediaTransport
              width_px={controls_width}
              button_size_px={TRANSPORT_BUTTON_SIZE_PX}
              operations={TRANSPORT_OPERATIONS}
              on_operation={this.on_transport_operation}
              disabled={points.length === 0}
            />
          </div>
          <div
            style={{ width: `${SPEED_SLIDER_WIDTH_PX}px`, marginTop: "0.5rem" }}
          >
            <CoolSlider
              min={1}
              max={10}
              value={animation_speed}
              step_count={90}
              is_vertical={false}
              on_change={this.on_animation_speed_changed}
            />
          </div>
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
