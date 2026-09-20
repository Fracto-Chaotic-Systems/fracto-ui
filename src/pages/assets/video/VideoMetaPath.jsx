import React, { Component } from "react";
import PropTypes from "prop-types";
import { Chart as ChartJS, registerables } from "chart.js";
import { Line } from "react-chartjs-2";

import AppText from "../../../AppText.jsx";
import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import { SETTING_LABEL_STYLE } from "../../../utils/ui/styles/SettingStyles.jsx";
import FractoRasterImage from "../../../utils/render/FractoRasterImage.jsx";
import CoolMediaTransport, {
  TRANSPORT_BEGIN,
  TRANSPORT_END,
  TRANSPORT_PAUSE,
  TRANSPORT_PLAY,
  TRANSPORT_REVERSE,
} from "../../../utils/ui/CoolMediaTransport.jsx";
import {
  KEY_VIDEO_ASSETS_PATH_IM,
  KEY_VIDEO_ASSETS_PATH_RE,
  KEY_VIDEO_ASSETS_PATH_SCOPE,
  KEY_VIDEO_ASSETS_STEP,
} from "../../../text/AssetsText.jsx";

ChartJS.register(...registerables);

const PATH_OPTIONS = [
  { id: "re", color: "#4472c4", text_key: KEY_VIDEO_ASSETS_PATH_RE },
  { id: "im", color: "#70ad47", text_key: KEY_VIDEO_ASSETS_PATH_IM },
  {
    id: "scope",
    color: "#ed7d31",
    text_key: KEY_VIDEO_ASSETS_PATH_SCOPE,
  },
];

/** Renders the video path editing area. */
export class VideoMetaPath extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
    selected_video: PropTypes.object,
    on_video_change: PropTypes.func,
  };

  state = {
    visible_paths: {
      re: true,
      im: true,
      scope: true,
    },
    animation_index: 0,
    animation_playing: false,
  };

  animation_timer_handle = null;

  get_steps = () => {
    const { selected_video } = this.props;
    let script = selected_video?.script;
    if (typeof script === "string") {
      try {
        script = JSON.parse(script);
      } catch (error) {
        script = {};
      }
    }
    return Array.isArray(script?.steps) ? script.steps : [];
  };

  on_path_visibility_changed = (path_id, visible) => {
    this.setState((previous_state) => ({
      visible_paths: {
        ...previous_state.visible_paths,
        [path_id]: visible,
      },
    }));
  };

  componentDidUpdate(prevProps) {
    if (prevProps.selected_video !== this.props.selected_video) {
      this.clear_animation_timer();
      this.setState({ animation_index: 0, animation_playing: false });
    }
  }

  componentWillUnmount() {
    this.clear_animation_timer();
  }

  clear_animation_timer = () => {
    if (this.animation_timer_handle) {
      clearInterval(this.animation_timer_handle);
      this.animation_timer_handle = null;
    }
  };

  advance_animation = (direction) => {
    const steps = this.get_steps();
    const path_points = this.sample_complex_path(steps);
    if (!path_points.length) {
      return;
    }
    let next_index = this.state.animation_index + direction;
    if (next_index >= path_points.length) {
      next_index = 0;
    }
    if (next_index < 0) {
      next_index = path_points.length - 1;
    }
    this.setState({ animation_index: next_index });
  };

  start_animation = (direction) => {
    const path_points = this.sample_complex_path(this.get_steps());
    if (!path_points.length) {
      return;
    }
    this.clear_animation_timer();
    this.animation_timer_handle = setInterval(
      () => this.advance_animation(direction),
      50,
    );
    this.setState({
      animation_playing: true,
    });
  };

  on_transport_operation = (operation) => {
    const path_points = this.sample_complex_path(this.get_steps());
    const last_index = Math.max(0, path_points.length - 1);
    if (operation === TRANSPORT_BEGIN) {
      this.clear_animation_timer();
      this.setState({ animation_index: 0, animation_playing: false });
    } else if (operation === TRANSPORT_END) {
      this.clear_animation_timer();
      this.setState({ animation_index: last_index, animation_playing: false });
    } else if (operation === TRANSPORT_PLAY) {
      this.start_animation(1);
    } else if (operation === TRANSPORT_REVERSE) {
      this.start_animation(-1);
    } else if (operation === TRANSPORT_PAUSE) {
      this.clear_animation_timer();
      this.setState({ animation_playing: false });
    }
  };

  get_chart_data = (path_option, steps) => ({
    labels: steps.map((step, step_index) => step_index + 1),
    datasets: [
      {
        label: AppText.get(path_option.text_key),
        data: steps.map((step) =>
          path_option.id === "scope"
            ? step.scope
            : step.focal_point?.[
                path_option.id === "re" ? "x" : "y"
              ],
        ),
        borderColor: path_option.color,
        backgroundColor: path_option.color,
        pointRadius: 3,
        tension: 0.25,
      },
    ],
  });

  get_component_tangent = (points, point_index) => {
    if (point_index === 0) {
      return {
        x: points[1].x - points[0].x,
        y: points[1].y - points[0].y,
      };
    }
    if (point_index === points.length - 1) {
      return {
        x: points[point_index].x - points[point_index - 1].x,
        y: points[point_index].y - points[point_index - 1].y,
      };
    }
    return {
      x: (points[point_index + 1].x - points[point_index - 1].x) / 2,
      y: (points[point_index + 1].y - points[point_index - 1].y) / 2,
    };
  };

  sample_complex_path = (steps) => {
    const points = steps
      .map((step) => step.focal_point)
      .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y));
    if (points.length < 2) {
      return points.map((point) => ({ x: point.x, y: point.y }));
    }
    const samples_per_segment = 50;
    const samples = [];
    for (let point_index = 0; point_index < points.length - 1; point_index += 1) {
      const point = points[point_index];
      const next_point = points[point_index + 1];
      const tangent = this.get_component_tangent(points, point_index);
      const next_tangent = this.get_component_tangent(
        points,
        point_index + 1,
      );
      for (let sample_index = 0; sample_index < samples_per_segment; sample_index += 1) {
        const t = sample_index / samples_per_segment;
        const t_squared = t * t;
        const t_cubed = t_squared * t;
        const h00 = 2 * t_cubed - 3 * t_squared + 1;
        const h10 = t_cubed - 2 * t_squared + t;
        const h01 = -2 * t_cubed + 3 * t_squared;
        const h11 = t_cubed - t_squared;
        samples.push({
          x:
            h00 * point.x +
            h10 * tangent.x +
            h01 * next_point.x +
            h11 * next_tangent.x,
          y:
            h00 * point.y +
            h10 * tangent.y +
            h01 * next_point.y +
            h11 * next_tangent.y,
        });
      }
    }
    const last_point = points[points.length - 1];
    samples.push({ x: last_point.x, y: last_point.y });
    return samples;
  };

  render_complex_chart = (steps, chart_height_px) => {
    const path_points = this.sample_complex_path(steps);
    const animation_point = path_points[this.state.animation_index];
    const focal_points = steps
      .map((step) => step.focal_point)
      .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
      .map((point) => ({ x: point.x, y: point.y }));
    const all_points = [...focal_points, ...path_points];
    steps.forEach((step) => {
      const focal_point = step.focal_point;
      const scope = step.scope;
      if (
        Number.isFinite(focal_point?.x) &&
        Number.isFinite(focal_point?.y) &&
        Number.isFinite(scope) &&
        scope > 0
      ) {
        all_points.push(
          { x: focal_point.x - scope / 2, y: focal_point.y - scope / 2 },
          { x: focal_point.x - scope / 2, y: focal_point.y + scope / 2 },
          { x: focal_point.x + scope / 2, y: focal_point.y - scope / 2 },
          { x: focal_point.x + scope / 2, y: focal_point.y + scope / 2 },
        );
      }
    });
    const x_values = all_points.map((point) => point.x);
    const y_values = all_points.map((point) => point.y);
    const min_x = x_values.length ? Math.min(...x_values) : -2;
    const max_x = x_values.length ? Math.max(...x_values) : 1;
    const min_y = y_values.length ? Math.min(...y_values) : -1.5;
    const max_y = y_values.length ? Math.max(...y_values) : 1.5;
    const center_x = (min_x + max_x) / 2;
    const center_y = (min_y + max_y) / 2;
    const plot_aspect_ratio = Math.max(
      0.001,
      chart_height_px / Math.max(1, this.props.width_px),
    );
    const x_range = Math.max(max_x - min_x, 0.001);
    const y_range = Math.max(max_y - min_y, 0.001);
    // Keep one world unit the same size on both axes, even when the display
    // area is rectangular. The raster underlay uses this same aspect ratio.
    const extent = Math.max(x_range, y_range / plot_aspect_ratio) * 1.1;
    const y_extent = extent * plot_aspect_ratio;
    const scope_datasets = steps
      .filter(
        (step) =>
          Number.isFinite(step.focal_point?.x) &&
          Number.isFinite(step.focal_point?.y) &&
          Number.isFinite(step.scope) &&
          step.scope > 0,
      )
      .map((step, step_index) => {
        const { x, y } = step.focal_point;
        const half_scope = step.scope / 2;
        return {
          label: `scope ${step_index + 1}`,
          data: [
            { x: x - half_scope, y: y - half_scope },
            { x: x - half_scope, y: y + half_scope },
            { x: x + half_scope, y: y + half_scope },
            { x: x + half_scope, y: y - half_scope },
            { x: x - half_scope, y: y - half_scope },
          ],
          borderColor: "#888888",
          backgroundColor: "transparent",
          borderWidth: 1,
          pointRadius: 0,
          showLine: true,
          tension: 0,
          parsing: false,
        };
      });
    return (
      <CoolStyles.Block
        style={{
          width: "100%",
          minWidth: 0,
          height: `${chart_height_px}px`,
          position: "relative",
        }}
      >
        <CoolStyles.Block
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.25,
            pointerEvents: "none",
          }}
        >
          <FractoRasterImage
            width_px={Math.max(1, Math.round(this.props.width_px))}
            focal_point={{ x: center_x, y: center_y }}
            scope={extent}
            aspect_ratio={plot_aspect_ratio}
          />
        </CoolStyles.Block>
        <CoolStyles.Block
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            height: "100%",
          }}
        >
          <Line
            data={{
              datasets: [
                ...scope_datasets,
              {
                label: "complex path",
                data: path_points,
                borderColor: "#4472c4",
                backgroundColor: "#4472c4",
                pointRadius: 0,
                tension: 0,
                showLine: true,
                parsing: false,
              },
              {
                label: "steps",
                data: focal_points,
                borderColor: "#c00000",
                backgroundColor: "#c00000",
                pointRadius: 5,
                pointHoverRadius: 6,
                showLine: false,
                parsing: false,
              },
              ...(animation_point
                ? [
                    {
                      label: "animation",
                      data: [animation_point],
                      borderColor: "#000000",
                      backgroundColor: "#000000",
                      pointRadius: 6,
                      pointHoverRadius: 7,
                      showLine: false,
                      parsing: false,
                    },
                  ]
                : []),
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
              },
              scales: {
                x: {
                  type: "linear",
                  min: center_x - extent / 2,
                  max: center_x + extent / 2,
                  ticks: { display: false },
                  title: { display: false },
                  border: { display: false },
                  grid: { display: false },
                },
                y: {
                  min: center_y - y_extent / 2,
                  max: center_y + y_extent / 2,
                  ticks: { display: false },
                  title: { display: false },
                  border: { display: false },
                  grid: { display: false },
                },
              },
              layout: { padding: 0 },
            }}
          />
        </CoolStyles.Block>
      </CoolStyles.Block>
    );
  };

  render_chart = (path_option, steps, chart_height_px) => (
    <CoolStyles.Block
      key={`video-path-chart-${path_option.id}`}
      style={{
        width: "100%",
        minWidth: 0,
        height: `${chart_height_px}px`,
        position: "relative",
      }}
    >
      <Line
        data={this.get_chart_data(path_option, steps)}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: AppText.get(KEY_VIDEO_ASSETS_STEP),
              },
            },
            y: {
              beginAtZero: false,
            },
          },
        }}
      />
    </CoolStyles.Block>
  );

  render() {
    const { width_px, height_px } = this.props;
    const { visible_paths } = this.state;
    const steps = this.get_steps();
    const visible_options = PATH_OPTIONS.filter(
      (path_option) => visible_paths[path_option.id],
    );
    const control_height_px = 32;
    const chart_area_height_px = Math.max(0, height_px - control_height_px);
    const chart_gap_px = 8;
    const chart_count = Math.max(visible_options.length, 1);
    const chart_height_px = Math.max(
      0,
      (chart_area_height_px - chart_gap_px * (chart_count - 1)) /
        chart_count,
    );
    return (
      <CoolStyles.Block
        style={{
          width: `${width_px}px`,
          height: `${height_px}px`,
          overflow: "hidden",
        }}
      >
        <CoolStyles.Block
          style={{
            display: "flex",
            alignItems: "center",
            height: `${control_height_px}px`,
            paddingLeft: "0.5rem",
            gap: "1rem",
          }}
        >
          <CoolMediaTransport
            width_px={140}
            button_size_px={28}
            on_operation={this.on_transport_operation}
            disabled={steps.length === 0}
          />
          {PATH_OPTIONS.map((path_option) => (
            <label
              key={`video-path-option-${path_option.id}`}
              style={SETTING_LABEL_STYLE}
            >
              <input
                type="checkbox"
                checked={visible_paths[path_option.id]}
                onChange={(event) =>
                  this.on_path_visibility_changed(
                    path_option.id,
                    event.target.checked,
                  )
                }
              />
              <CoolStyles.InlineBlock
                style={{
                  marginLeft: "0.35rem",
                  fontWeight: "bold",
                  fontStyle: "italic",
                }}
              >
                {AppText.get(path_option.text_key)}
              </CoolStyles.InlineBlock>
            </label>
          ))}
        </CoolStyles.Block>
        <CoolStyles.Block
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gridTemplateRows: `repeat(${chart_count}, minmax(0, 1fr))`,
            gap: `${chart_gap_px}px`,
            width: `${width_px}px`,
            height: `${chart_area_height_px}px`,
          }}
        >
          {visible_options.length
            ? visible_options.map((path_option) =>
                this.render_chart(path_option, steps, chart_height_px),
              )
            : this.render_complex_chart(steps, chart_height_px)}
        </CoolStyles.Block>
      </CoolStyles.Block>
    );
  }
}

export default VideoMetaPath;
