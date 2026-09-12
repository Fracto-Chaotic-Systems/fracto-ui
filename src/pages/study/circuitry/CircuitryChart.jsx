import React, { Component } from "react";
import PropTypes from "prop-types";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, registerables } from "chart.js";
import FractoUtil from "../../../../../../sdk/FractoUtil.js";

ChartJS.register(...registerables);

import { MainStyles as styles } from "../../../styles/MainStyles.jsx";
import DataBackend from "../../../backend/DataBackend.jsx";
import AppText from "../../../AppText.jsx";
import AppSettings from "../../../AppSettings.jsx";
import { render_pattern_block } from "../StudyUtils.jsx";
import {
  KEY_STUDY_CIRCUITRY_NO_ORBITAL,
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
const DISTANCE_CHART_SAMPLE_COUNT = 10;
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
        const rotated_response = this.rotate_circuitry_to_origin(response);
        this.setState({
          circuitry_data: rotated_response,
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

  /**
   * Rotate the orbit so its point nearest the origin is first. The
   * interpolated radial-sweep samples are rotated by the same whole-interval
   * offset, keeping the chart, distance chart, and point table synchronized.
   *
   * @param {object} response Circuitry response from the data server.
   * @returns {object} Response with consistently rotated point arrays.
   */
  rotate_circuitry_to_origin = (response) => {
    let orbital_points = response?.orbital_points || [];
    const samples = response?.result || [];
    if (samples.length < 2) {
      return response;
    }
    const reported_cardinality = Number(response?.cardinality);
    const reported_samples_per_interval =
      reported_cardinality > 1
        ? (samples.length - 1) / reported_cardinality
        : 0;
    if (
      Number.isInteger(reported_cardinality) &&
      reported_cardinality > 1 &&
      Number.isInteger(reported_samples_per_interval) &&
      reported_samples_per_interval > 0 &&
      orbital_points.length !== reported_cardinality
    ) {
      orbital_points = Array.from(
        { length: reported_cardinality },
        (_, index) => samples[index * reported_samples_per_interval]?.C,
      )
        .filter(Boolean)
        .map((point) => ({ re: point.re, im: point.im }));
    }
    if (orbital_points.length < 2) {
      return response;
    }
    const normalized_response = {
      ...response,
      orbital_points,
    };
    let nearest_index = 0;
    let nearest_distance = Number.POSITIVE_INFINITY;
    orbital_points.forEach((point, index) => {
      const distance = point.re ** 2 + point.im ** 2;
      if (distance < nearest_distance) {
        nearest_distance = distance;
        nearest_index = index;
      }
    });
    if (nearest_index === 0) {
      return normalized_response;
    }
    const samples_per_interval =
      (samples.length - 1) / orbital_points.length;
    if (!Number.isInteger(samples_per_interval) || samples_per_interval < 1) {
      return normalized_response;
    }
    const rotate = (values, offset) =>
      values.slice(offset).concat(values.slice(0, offset));
    const rotated_orbital_points = rotate(orbital_points, nearest_index);
    const sample_cycle = samples.slice(0, -1);
    const sample_offset = nearest_index * samples_per_interval;
    const rotated_sample_cycle = rotate(sample_cycle, sample_offset);
    return {
      ...normalized_response,
      orbital_points: rotated_orbital_points,
      result: [
        ...rotated_sample_cycle,
        { ...rotated_sample_cycle[0] },
      ],
    };
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
    const points_list_height = Math.floor(Math.max(0, height_px) / 3);
    const points = (circuitry_data?.result || []).map(({ C }) => ({
      x: C.re,
      y: C.im,
    }));
    const orbital_table_data = (circuitry_data?.orbital_points || []).map(
      (point) => ({
        coordinates: [render_coordinates, { x: point.re, y: point.im }],
      }),
    );
    const radial_samples_per_interval =
      circuitry_data?.cardinality > 0
        ? (points.length - 1) / circuitry_data.cardinality
        : 0;
    const no_orbital =
      circuitry_data?.orbit_status === "outside_mandelbrot_set";
    const orbital_points = (circuitry_data?.result || [])
      .filter(({ t }, index) =>
        radial_sweep
          ? radial_samples_per_interval > 0 &&
            index % radial_samples_per_interval === 0
          : Math.abs(t - Math.round(t)) < 1e-9,
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
    const interpolated_points = circuitry_data?.result || [];
    const interval_count = circuitry_data?.orbital_points?.length || 0;
    const source_samples_per_interval =
      interval_count > 0 && interpolated_points.length > 1
        ? (interpolated_points.length - 1) / interval_count
        : 0;
    const distance_sample_count =
      interval_count > 0 && source_samples_per_interval > 0
        ? interval_count * DISTANCE_CHART_SAMPLE_COUNT + 1
        : 0;
    const distance_chart_data =
      circuitry_data?.Q && distance_sample_count > 0
        ? Array.from({ length: distance_sample_count }, (_, sample_index) => {
            const is_closing_sample = sample_index === distance_sample_count - 1;
            const result_index = is_closing_sample
              ? interpolated_points.length - 1
              : Math.round(
                  Math.floor(sample_index / DISTANCE_CHART_SAMPLE_COUNT) *
                    source_samples_per_interval +
                    (sample_index % DISTANCE_CHART_SAMPLE_COUNT) *
                      (source_samples_per_interval /
                        DISTANCE_CHART_SAMPLE_COUNT),
                );
            const point = interpolated_points[result_index]?.C;
            return {
              x: sample_index / DISTANCE_CHART_SAMPLE_COUNT,
              y: point
                ? Math.hypot(
                    point.re - circuitry_data.Q.re,
                    point.im - circuitry_data.Q.im,
                  )
                : 0,
            };
          })
        : [];
    const distance_chart_point_radii = distance_chart_data.map(
      (_, sample_index) =>
        sample_index % DISTANCE_CHART_SAMPLE_COUNT === 0 ||
        sample_index === distance_chart_data.length - 1
          ? 3
          : 0,
    );
    const distance_chart_point_colors = distance_chart_data.map(
      (_, sample_index) =>
        sample_index % DISTANCE_CHART_SAMPLE_COUNT === 0 ||
        sample_index === distance_chart_data.length - 1
          ? FractoUtil.fracto_pattern_color(circuitry_data?.cardinality || 0)
          : "transparent",
    );
    const distance_chart_actual_points = distance_chart_data.filter(
      (_, sample_index) =>
        sample_index % DISTANCE_CHART_SAMPLE_COUNT === 0 ||
        sample_index === distance_chart_data.length - 1,
    );
    const animation_result_point = interpolated_points[animation_index]?.C;
    const distance_animation_point =
      circuitry_data?.Q && animation_result_point && source_samples_per_interval
        ? [
            {
              x: animation_index / source_samples_per_interval,
              y: Math.hypot(
                animation_result_point.re - circuitry_data.Q.re,
                animation_result_point.im - circuitry_data.Q.im,
              ),
            },
          ]
        : [];
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
    const distance_chart_width = Math.max(0, controls_width);
    const distance_chart_height = Math.max(
      1,
      Math.floor(distance_chart_width / GOLDEN_RATIO),
    );
    const distance_values = distance_chart_data.map(({ y }) => y);
    const distance_min = distance_values.length
      ? Math.min(...distance_values)
      : 0;
    const distance_max = distance_values.length
      ? Math.max(...distance_values)
      : 1;
    const distance_range = distance_max - distance_min;
    const distance_padding = Math.max(
      distance_range * 0.05,
      Math.abs(distance_max) * 0.01,
      1e-12,
    );
    const distance_chart_options = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          type: "linear",
          title: { display: false },
          ticks: { display: false },
        },
        y: {
          title: { display: false },
          ticks: { display: false },
          min: Math.max(0, distance_min - distance_padding),
          max: distance_max + distance_padding,
        },
      },
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
          {distance_chart_data.length > 0 ? (
            <div
              style={{
                width: `${distance_chart_width}px`,
                height: `${distance_chart_height}px`,
                marginTop: "0.5rem",
              }}
            >
              <Line
                data={{
                  datasets: [
                    {
                      data: distance_chart_data,
                      borderColor: "#888888",
                      backgroundColor: "#888888",
                      pointBackgroundColor: distance_chart_point_colors,
                      pointBorderColor: distance_chart_point_colors,
                      borderWidth: 1,
                      pointRadius: distance_chart_point_radii,
                      pointHoverRadius: 0,
                      tension: 0,
                    },
                    {
                      data: distance_chart_actual_points,
                      backgroundColor: "#000000",
                      borderColor: "#000000",
                      pointRadius: 1,
                      showLine: false,
                    },
                    {
                      data: distance_animation_point,
                      backgroundColor: "#ffcc33",
                      borderColor: "#333333",
                      borderWidth: 1,
                      pointRadius: 5,
                      showLine: false,
                      order: -1000,
                    },
                  ],
                }}
                options={distance_chart_options}
              />
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
          <div
            style={{
              height: `${points_list_height}px`,
              marginTop: "0.5rem",
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            <CoolTable
              columns={ORBITAL_POINT_COLUMNS}
              data={orbital_table_data}
              on_select_row={this.on_orbital_point_selected}
              options={[TABLE_CAN_SELECT, TABLE_NO_BORDER, TABLE_NO_HEADER]}
              selected_row={selected_orbital_row}
              scroll_selected_row
            />
          </div>
        </styles.ContentWrapper>
      </>
    );
  }
}

export default CircuitryChart;
