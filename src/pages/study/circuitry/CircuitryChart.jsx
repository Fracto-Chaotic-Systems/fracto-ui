import { circuitry_layout } from "./CircuitryLayout.js";
import { orbital_start_index } from "../points/PointsOrbitalOrder.js";
import React, { Component } from "react";
import PropTypes from "prop-types";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, registerables } from "chart.js";
import FractoUtil from "@fracto/sdk/FractoUtil.js";

ChartJS.register(...registerables);

import { MainStyles as styles } from "../../../styles/MainStyles.jsx";
import DataBackend from "../../../backend/DataBackend.jsx";
import AppText from "../../../AppText.jsx";
import { render_pattern_block } from "../StudyUtils.jsx";
import {
  build_chart_waveform_profile,
  DISTANCE_CHART_SAMPLE_COUNT,
  normalize_waveform_profile,
  validate_waveform_continuity,
} from "./CircuitryAudioUtils.js";
import {
  CircuitryAudioController,
  load_playback_volume,
  MIN_PLAYBACK_VOLUME,
  MAX_PLAYBACK_VOLUME,
  AUDIO_TRANSITION_CROSSFADE,
} from "./CircuitryAudioController.js";
import {
  KEY_STUDY_CIRCUITRY_NO_ORBITAL,
  KEY_STUDY_CIRCUITRY_ORBITAL_DESCRIPTION,
  KEY_STUDY_CIRCUITRY_ORBITAL_PROGRESS,
  KEY_STUDY_CIRCUITRY_CLOCKWISE,
  KEY_STUDY_CIRCUITRY_COUNTER_CLOCKWISE,
  KEY_STUDY_MAGNITUDE,
  KEY_STUDY_CIRCUITRY_DETECTED_IN,
  KEY_STUDY_CIRCUITRY_PLAY,
  KEY_STUDY_CIRCUITRY_STOP,
} from "../../../text/StudyText.jsx";
import { click_point_chart } from "../../../utils/render/PatternsUtils.jsx";
import { CoolTransportStyles as transport_styles } from "../../../utils/ui/styles/CoolTransportStyles.jsx";
import { sound_off_icon, sound_on_icon } from "../../../utils/ui/CoolIcons.jsx";
import { IMAGE_FRAME_STYLE } from "../../../utils/render/ImageFrameStyle.jsx";
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
const TRANSPORT_BUTTON_SIZE_PX = 35;
const PATH_ANIMATION_RATE_FPS = 100; // Former 20 FPS base at the maximum 5× speed.
const MIN_ANIMATION_SPEED = 0.125;
const MAX_ANIMATION_SPEED = 1;
const DEFAULT_ANIMATION_SPEED = 0.625;
const ANIMATION_SPEED_STORAGE_KEY = "fracto.circuitry.animation_speed";
const load_animation_speed = () => {
  try {
    const saved = window.localStorage.getItem(ANIMATION_SPEED_STORAGE_KEY);
    const value = saved === null || saved.trim() === "" ? NaN : Number(saved);
    return Number.isFinite(value)
      ? Math.min(MAX_ANIMATION_SPEED, Math.max(MIN_ANIMATION_SPEED, value))
      : DEFAULT_ANIMATION_SPEED;
  } catch {
    return DEFAULT_ANIMATION_SPEED;
  }
};
const GOLDEN_RATIO = 1.618;
const FREQUENCY_PER_CARDINALITY_HZ = 27.5;

export class CircuitryChart extends Component {
  static propTypes = {
    focal_point: PropTypes.object,
    selected_orbital: PropTypes.object,
    on_active_point_changed: PropTypes.func,
    point_selection_request: PropTypes.object,
    scope: PropTypes.number,
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
    animation_speed: load_animation_speed(),
    animation_timer: null,
    audio_playing: false,
    audio_volume: load_playback_volume(),
  };

  audio_controller = new CircuitryAudioController({
    on_playing_changed: (audio_playing) => {
      if (!this.is_unmounted) {
        this.setState({ audio_playing });
      }
    },
  });
  // The live timer is owned by the component instance. React state mirrors
  // its presence for rendering, but is asynchronous and must not be used as
  // the cancellation source for transport commands.
  animation_timer_handle = null;
  audio_resume_generation = 0;
  circuitry_request_generation = 0;
  is_unmounted = false;

  componentDidMount() {
    if (this.has_focal_point(this.props.focal_point)) {
      this.load_circuitry(this.props.focal_point);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.selected_orbital_row !== this.state.selected_orbital_row ||
        prevState.animation_playing !== this.state.animation_playing ||
        prevState.circuitry_data !== this.state.circuitry_data) {
      const row = this.state.selected_orbital_row;
      const source_row = this.state.circuitry_data?.orbital_point_indices?.[row] ?? row;
      const point_index = this.props.selected_orbital?.points?.[source_row]?.point_index ?? -1;
      // A replacement can be loading while the previous curve keeps moving.
      // Its indices must not highlight points in the newly selected orbital.
      if (!this.state.circuitry_data?.orbital_id ||
          this.state.circuitry_data.orbital_id === this.props.selected_orbital?.orbital_id) {
        this.props.on_active_point_changed?.(this.props.selected_orbital?.orbital_id, point_index, this.state.animation_playing);
      }
    }
    const { focal_point } = this.props;
    const previous_focal_point = prevProps.focal_point;
    if (!this.has_focal_point(focal_point)) {
      return;
    }
    if (
      prevProps.selected_orbital !== this.props.selected_orbital ||
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
    this.apply_point_selection();
  }

  applied_point_selection = null;

  apply_point_selection = () => {
    const request = this.props.point_selection_request;
    const data = this.state.circuitry_data;
    if (!request || request === this.applied_point_selection ||
        request.orbital_id !== this.props.selected_orbital?.orbital_id ||
        request.orbital_id !== data?.orbital_id) return;
    const source_row = this.props.selected_orbital.points.findIndex(
      (point) => point.point_index === request.point_index,
    );
    const row = data.orbital_point_indices
      ? data.orbital_point_indices.indexOf(source_row)
      : source_row;
    if (row < 0 || !data.orbital_points?.[row] || !data.result?.length) return;
    this.applied_point_selection = request;
    this.on_orbital_point_selected(row);
  };

  componentWillUnmount() {
    this.is_unmounted = true;
    this.circuitry_request_generation += 1;
    this.clear_animation_timer();
    this.audio_controller.dispose();
  }

  has_focal_point = (focal_point) =>
    focal_point &&
    Number.isFinite(Number(focal_point.x)) &&
    Number.isFinite(Number(focal_point.y));

  stop_audio = (immediate = false) => {
    this.audio_controller.stop(immediate);
  };

  play_audio = async (transition) => {
    const { circuitry_data } = this.state;
    const profile = circuitry_data?.waveform_profile || [];
    const cardinality = Number(circuitry_data?.cardinality);
    const frequency_hz =
      Number.isFinite(cardinality) && cardinality > 0
        ? cardinality * FREQUENCY_PER_CARDINALITY_HZ
        : undefined;
    await this.audio_controller.play(profile, { transition, frequency_hz });
  };

  on_audio_toggle = () => {
    this.audio_resume_generation += 1;
    if (this.state.audio_playing) {
      this.stop_audio();
    } else {
      this.play_audio();
    }
  };

  on_volume_change = (event) => {
    const audio_volume = Number(event.target.value) / 100;
    this.audio_controller.set_volume(audio_volume);
    this.setState({ audio_volume });
  };

  on_animation_speed_change = (event) => {
    const value = Number(event.target.value) / 100;
    if (!Number.isFinite(value)) return;
    const animation_speed = Math.min(MAX_ANIMATION_SPEED, Math.max(MIN_ANIMATION_SPEED, value));
    try {
      window.localStorage.setItem(ANIMATION_SPEED_STORAGE_KEY, String(animation_speed));
    } catch {
      // Changing the speed still works when browser storage is unavailable.
    }
    this.setState({ animation_speed });
    if (this.animation_timer_handle) {
      this.start_animation(this.state.animation_direction, animation_speed);
    }
  };

  load_circuitry = (focal_point) => {
    const request_generation = ++this.circuitry_request_generation;
    // An explicit selection (including null) opts out of focal-point detection.
    if (this.props.selected_orbital !== undefined) {
      // Leave the timer and current curve running until their replacement is
      // ready. An empty selection still releases the animation immediately.
      if (!this.animation_timer_handle || !this.props.selected_orbital?.orbital_id) {
        this.clear_animation_timer();
        this.setState({
          circuitry_data: null,
          error: null,
          animation_index: 0,
          selected_orbital_row: -1,
          selected_orbital_point: null,
          animation_playing: false,
        });
      }
      if (!this.props.selected_orbital?.orbital_id) {
        this.audio_resume_generation++;
        this.stop_audio(true);
        return;
      }
    }
    const resume_audio = this.state.audio_playing;
    const resume_generation = ++this.audio_resume_generation;
    // Keep the current waveform audible while the replacement is fetched.
    // When no sample is playing, this is still a harmless cleanup call.
    if (!resume_audio) {
      this.stop_audio();
    }
    DataBackend.get_circuitry(
      focal_point,
      (response) => {
        // Navigation can issue another request before this response arrives.
        // Only the newest focal point is allowed to replace the visible chart.
        if (
          this.is_unmounted ||
          request_generation !== this.circuitry_request_generation
        ) {
          return;
        }
        if (response.error) {
          this.setState({ error: response.error });
          return;
        }
        const rotated_response = this.rotate_circuitry_to_origin(response);
        const waveform_profile = normalize_waveform_profile(
          build_chart_waveform_profile(
            rotated_response.result,
            rotated_response.Q,
            rotated_response.cardinality,
          ),
        );
        const waveform_continuity =
          validate_waveform_continuity(waveform_profile);
        const circuitry_data = {
          ...rotated_response,
          waveform_profile,
          waveform_continuity,
        };
        this.setState(
          (previous) => {
            const animating = !!this.animation_timer_handle;
            const same_period = previous.circuitry_data?.cardinality === circuitry_data.cardinality;
            const old_extent = previous.circuitry_data?.result?.length - 1;
            const new_extent = Math.max(0, (circuitry_data.result?.length || 1) - 1);
            const animation_index = animating && same_period && old_extent > 0
              ? Math.min(new_extent, Math.round(previous.animation_index * new_extent / old_extent))
              : 0;
            return {
              circuitry_data,
              error: null,
              animation_index,
              selected_orbital_row: animating
                ? this.get_animation_orbital_row(animation_index, circuitry_data)
                : -1,
              selected_orbital_point: null,
            };
          },
          () => {
            if (
              resume_audio &&
              resume_generation === this.audio_resume_generation &&
              !this.is_unmounted
            ) {
              this.play_audio(AUDIO_TRANSITION_CROSSFADE);
            }
          },
        );
      },
      true,
      this.state.radial_sweep ? "radial_sweep" : "hermite",
      this.props.selected_orbital?.orbital_id,
    );
  };

  /**
   * For a selected stored orbit, start at the lowest landing numerator.
   * Detected orbits without an explicit selection start nearest the origin. The
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
      orbital_point_indices: orbital_points.map((_, index) => index),
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
    if (this.props.selected_orbital) {
      nearest_index = orbital_start_index(this.props.selected_orbital);
    }
    if (nearest_index === 0) {
      return normalized_response;
    }
    const samples_per_interval = (samples.length - 1) / orbital_points.length;
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
      orbital_point_indices: rotate(normalized_response.orbital_point_indices, nearest_index),
      result: [...rotated_sample_cycle, { ...rotated_sample_cycle[0] }],
    };
  };

  on_orbital_point_selected = (row) => {
    const orbital_point = this.state.circuitry_data?.orbital_points?.[row];
    const samples = this.state.circuitry_data?.result || [];
    if (!orbital_point || samples.length === 0) {
      return;
    }
    // Each stored point starts a sampled interval. Use its index rather than
    // comparing rounded coordinates, which can coincide for nearby points.
    const interval_width = (samples.length - 1) / this.state.circuitry_data.orbital_points.length;
    const nearest_index = Math.round(row * interval_width);
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
    if (this.animation_timer_handle) {
      clearInterval(this.animation_timer_handle);
      this.animation_timer_handle = null;
    }
    if (!this.is_unmounted) {
      this.setState({ animation_timer: null });
    }
  };

  get_animation_orbital_row = (sample_index, circuitry_data = this.state.circuitry_data) => {
    const orbital_points = circuitry_data?.orbital_points || [];
    const samples = circuitry_data?.result || [];
    if (
      !Number.isFinite(sample_index) ||
      orbital_points.length === 0 ||
      samples.length === 0
    ) {
      return -1;
    }
    if (orbital_points.length === 1) return 0;
    // Both interpolators sample each interval uniformly, including a closing
    // sample. Index-based tracking survives rotation and uneven sweep angles.
    const interval_width = (samples.length - 1) / orbital_points.length;
    if (interval_width <= 0) return -1;
    return Math.round(sample_index / interval_width) % orbital_points.length;
  };

  advance_animation = (direction) => {
    const point_count = this.state.circuitry_data?.result?.length || 0;
    if (point_count === 0) return;
    let next_index = this.state.animation_index + direction;
    if (next_index >= point_count) next_index = 0;
    if (next_index < 0) next_index = point_count - 1;
    const selected_orbital_row = this.get_animation_orbital_row(next_index);
    this.setState({
      animation_index: next_index,
      selected_orbital_row,
      selected_orbital_point: null,
    });
  };

  start_animation = (direction, speed = this.state.animation_speed) => {
    this.clear_animation_timer();
    this.animation_timer_handle = setInterval(
      () => this.advance_animation(direction),
      1000 / (PATH_ANIMATION_RATE_FPS * speed),
    );
    this.setState({
      animation_direction: direction,
      animation_playing: true,
      animation_timer: this.animation_timer_handle,
      selected_orbital_point: null,
    });
  };

  on_transport_operation = (operation) => {
    if (operation === TRANSPORT_BEGIN) {
      this.clear_animation_timer();
      this.setState({
        animation_index: 0,
        animation_playing: false,
        selected_orbital_row: this.get_animation_orbital_row(0),
        selected_orbital_point: null,
      });
    }
    if (operation === TRANSPORT_END) {
      this.clear_animation_timer();
      const point_count = this.state.circuitry_data?.result?.length || 1;
      this.setState({
        animation_index: point_count - 1,
        animation_playing: false,
        selected_orbital_row: this.get_animation_orbital_row(point_count - 1),
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
    const { focal_point, scope } = this.props;
    const {
      circuitry_data,
      error,
      radial_sweep,
      animation_index,
      selected_orbital_row,
      selected_orbital_point,
      audio_playing,
    } = this.state;
    const {
      chart_size,
      options_width,
      distance_chart_width,
      distance_chart_height,
    } = circuitry_layout(width_px, height_px);
    const points = (circuitry_data?.result || []).map(({ C }) => ({
      x: C.re,
      y: C.im,
    }));
    const radial_samples_per_interval =
      circuitry_data?.cardinality > 0
        ? (points.length - 1) / circuitry_data.cardinality
        : 0;
    const no_orbital =
      circuitry_data?.orbit_status === "outside_mandelbrot_set";
    const single_point_orbit =
      circuitry_data?.cardinality === 1 &&
      circuitry_data?.orbital_points?.length === 1;
    const view_center =
      single_point_orbit && this.props.selected_orbital
        ? {
            x: circuitry_data.orbital_points[0].re,
            y: circuitry_data.orbital_points[0].im,
          }
        : focal_point;
    const navigator_bounds =
      single_point_orbit &&
      Number.isFinite(Number(scope)) &&
      Number(scope) > 0 &&
      Number.isFinite(Number(view_center?.x)) &&
      Number.isFinite(Number(view_center?.y))
        ? {
            min_x: Number(view_center.x) - Number(scope) / 2,
            max_x: Number(view_center.x) + Number(scope) / 2,
            min_y: Number(view_center.y) - Number(scope) / 2,
            max_y: Number(view_center.y) + Number(scope) / 2,
          }
        : null;
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
    const waveform_profile =
      circuitry_data?.waveform_profile ||
      build_chart_waveform_profile(
        circuitry_data?.result,
        circuitry_data?.Q,
        circuitry_data?.cardinality,
      );
    const interpolated_points = circuitry_data?.result || [];
    const interval_count = circuitry_data?.orbital_points?.length || 0;
    const source_samples_per_interval =
      interval_count > 0 && interpolated_points.length > 1
        ? (interpolated_points.length - 1) / interval_count
        : 0;
    const distance_chart_data = waveform_profile.map((sample) => ({
      x: sample.phase * interval_count,
      y: sample.value,
    }));
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
    const sampled_cycle_count =
      circuitry_data?.result?.length > 1
        ? Math.abs(
            (circuitry_data.result.at(-2)?.t || 0) -
              (circuitry_data.result[0]?.t || 0),
          ) /
          (2 * Math.PI)
        : 0;
    const orbital_cycle_count = radial_sweep
      ? Math.max(
          1,
          Math.round(
            Number(circuitry_data?.cycles) || sampled_cycle_count || 1,
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
      margin: "8px",
      flexShrink: 0,
      boxSizing: "border-box",
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
    const controls_width = options_width;
    const options_style = {
      width: `${options_width}px`,
      margin: "0 8px",
      boxSizing: "border-box",
      verticalAlign: "top",
      flexShrink: 1,
      minWidth: 0,
      overflowX: "hidden",
      textAlign: "left",
    };
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
    const distance_chart_max_x = distance_chart_data.at(-1)?.x || 0;
    const revolution_count = Math.max(
      1,
      Math.round(Number(circuitry_data?.cycles) || 1),
    );
    const distance_revolution_markers = Array.from(
      // Mark the shared start and each internal revolution boundary. The
      // closing endpoint is intentionally omitted because it is the same
      // location as the start and would draw a duplicate boundary.
      { length: revolution_count },
      (_, index) => {
        const x = (distance_chart_max_x * index) / revolution_count;
        return {
          data: [
            { x, y: distance_min - distance_padding },
            { x, y: distance_max + distance_padding },
          ],
          borderColor: "#666666",
          borderWidth: 1,
          borderDash: [6, 4],
          pointRadius: 0,
          pointHoverRadius: 0,
          showLine: true,
          tension: 0,
          order: 10,
        };
      },
    );
    const distance_point_stems = distance_chart_actual_points.map((point) => ({
      data: [
        { x: point.x, y: distance_min - distance_padding },
        { x: point.x, y: point.y },
      ],
      borderColor: "#888888",
      borderWidth: 1,
      pointRadius: 0,
      pointHoverRadius: 0,
      showLine: true,
      tension: 0,
      order: 5,
    }));
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
      <div
        style={{
          display: "flex",
          flexWrap: "nowrap",
          alignItems: "flex-start",
          width: "100%",
          minWidth: 0,
          overflowX: "hidden",
        }}
      >
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
              single_point_orbit ? null : radial_origin,
              highlighted_point,
              0,
              selected_orbital_row,
              circuitry_data.cardinality,
              highlighted_t,
              orbital_t_values,
              true,
              navigator_bounds,
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
                    ...distance_revolution_markers,
                    ...distance_point_stems,
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "0.5rem",
              flexWrap: "wrap",
              columnGap: "1rem",
              rowGap: "0.5rem",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                flexDirection: "column",
                verticalAlign: "top",
                flexShrink: 0,
              }}
            >
              <div>
                <CoolMediaTransport
                width_px={controls_width}
                button_size_px={TRANSPORT_BUTTON_SIZE_PX}
                operations={TRANSPORT_OPERATIONS}
                on_operation={this.on_transport_operation}
                disabled={points.length === 0}
                />
              </div>
            </div>
            <div
              style={{
                alignSelf: "flex-start",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexShrink: 0,
              }}
            >
              <transport_styles.GenericButton
                title={
                  audio_playing
                    ? AppText.get(KEY_STUDY_CIRCUITRY_STOP)
                    : AppText.get(KEY_STUDY_CIRCUITRY_PLAY)
                }
                onClick={this.on_audio_toggle}
                disabled={waveform_profile.length < 2}
                style={{
                  width: `${TRANSPORT_BUTTON_SIZE_PX}px`,
                  height: `${TRANSPORT_BUTTON_SIZE_PX}px`,
                  padding: 0,
                  margin: "0 2px",
                  boxSizing: "border-box",
                }}
              >
                {audio_playing ? sound_off_icon : sound_on_icon}
              </transport_styles.GenericButton>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem", fontSize: "0.75rem", width: "100%", maxWidth: "320px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", flex: 1, minWidth: 0 }}>
              Speed
              <input
                type="range"
                aria-label="Animation speed"
                min={MIN_ANIMATION_SPEED * 100}
                max={MAX_ANIMATION_SPEED * 100}
                step="0.5"
                value={this.state.animation_speed * 100}
                onChange={this.on_animation_speed_change}
                title={`Animation speed: ${this.state.animation_speed * 100}%`}
                style={{ width: "90px", minWidth: 0, flex: 1, margin: 0 }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", flex: 1, minWidth: 0 }}>
              Volume
              <input
                type="range"
                aria-label="Playback volume"
                min={MIN_PLAYBACK_VOLUME * 100}
                max={MAX_PLAYBACK_VOLUME * 100}
                step="1"
                value={Math.round(this.state.audio_volume * 100)}
                onChange={this.on_volume_change}
                title={`Volume: ${Math.round(this.state.audio_volume * 100)}%`}
                style={{ width: "80px", minWidth: 0, flex: 1, margin: 0 }}
              />
            </label>
          </div>
        </styles.ContentWrapper>
      </div>
    );
  }
}

export default CircuitryChart;
