import React, { Component } from "react";
import PropTypes from "prop-types";
import { Chart as ChartJS, registerables } from "chart.js";
import { Line } from "react-chartjs-2";

import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import FractoRasterImage from "../../../utils/render/FractoRasterImage.jsx";

ChartJS.register(...registerables);

/** Returns the normalized step list stored in a video script. */
export const get_video_steps = (selected_video) => {
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

const get_tangent = (points, point_index) => {
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

/** Samples the same smooth, non-cyclic path used by the paths tab. */
export const sample_video_path = (steps) => {
  const points = steps
    .map((step) => step.focal_point)
    .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y));
  if (points.length < 2) {
    return points.map((point) => ({ x: point.x, y: point.y }));
  }
  const samples = [];
  const samples_per_segment = 50;
  for (let point_index = 0; point_index < points.length - 1; point_index += 1) {
    const point = points[point_index];
    const next_point = points[point_index + 1];
    const tangent = get_tangent(points, point_index);
    const next_tangent = get_tangent(points, point_index + 1);
    for (
      let sample_index = 0;
      sample_index < samples_per_segment;
      sample_index += 1
    ) {
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

/** Returns the focal point and scope at a sampled path position. */
export const get_video_frame_at = (steps, sample_index) => {
  const path_points = sample_video_path(steps);
  const scoped_steps = steps.filter(
    (step) =>
      Number.isFinite(step.focal_point?.x) &&
      Number.isFinite(step.focal_point?.y) &&
      Number.isFinite(step.scope) &&
      step.scope > 0,
  );
  if (!scoped_steps.length) {
    return null;
  }
  if (scoped_steps.length === 1) {
    return {
      focal_point: { ...scoped_steps[0].focal_point },
      scope: scoped_steps[0].scope,
    };
  }
  const samples_per_segment = 50;
  const segment_index = Math.min(
    scoped_steps.length - 2,
    Math.floor(sample_index / samples_per_segment),
  );
  const local_t = Math.min(
    1,
    (sample_index % samples_per_segment) / samples_per_segment,
  );
  const current_step = scoped_steps[segment_index];
  const next_step = scoped_steps[segment_index + 1];
  const path_point =
    path_points[
      Math.min(Math.max(0, sample_index), Math.max(0, path_points.length - 1))
    ];
  return {
    focal_point: path_point || { ...current_step.focal_point },
    scope:
      current_step.scope + (next_step.scope - current_step.scope) * local_t,
  };
};

/**
 * Renders a video's focal-point path in the complex plane.
 *
 * This intentionally contains no scope-frame datasets. It is shared by
 * preview-style views where the path and its control points are useful, but
 * the individual frame bounds would add visual noise.
 */
export class VideoComplexPathChart extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
    selected_video: PropTypes.object,
    animation_index: PropTypes.number,
    animation_running: PropTypes.bool,
  };

  state = {
    plot_area: null,
  };

  componentDidMount() {
    this.schedule_plot_area_sync();
  }

  componentDidUpdate(previous_props) {
    if (
      previous_props.width_px !== this.props.width_px ||
      previous_props.height_px !== this.props.height_px ||
      previous_props.selected_video !== this.props.selected_video
    ) {
      this.schedule_plot_area_sync();
    }
  }

  schedule_plot_area_sync = () => {
    if (this.plot_area_sync_handle) {
      cancelAnimationFrame(this.plot_area_sync_handle);
    }
    this.plot_area_sync_handle = requestAnimationFrame(this.sync_plot_area);
  };

  sync_plot_area = () => {
    const chart_area = this.chart_instance?.chartArea;
    if (!chart_area) {
      return;
    }
    const plot_area = {
      left: chart_area.left,
      right: chart_area.right,
      top: chart_area.top,
      bottom: chart_area.bottom,
      width: chart_area.right - chart_area.left,
      height: chart_area.bottom - chart_area.top,
    };
    const previous_area = this.state.plot_area;
    if (
      previous_area &&
      previous_area.left === plot_area.left &&
      previous_area.right === plot_area.right &&
      previous_area.top === plot_area.top &&
      previous_area.bottom === plot_area.bottom
    ) {
      return;
    }
    this.setState({ plot_area });
  };

  set_chart_instance = (chart_instance) => {
    this.chart_instance = chart_instance;
  };

  componentWillUnmount() {
    if (this.plot_area_sync_handle) {
      cancelAnimationFrame(this.plot_area_sync_handle);
      this.plot_area_sync_handle = null;
    }
  }

  get_steps = () => {
    return get_video_steps(this.props.selected_video);
  };

  get_chart_bounds = (points, width_px, height_px) => {
    const x_values = points.map((point) => point.x);
    const y_values = points.map((point) => point.y);
    const min_x = x_values.length ? Math.min(...x_values) : -2;
    const max_x = x_values.length ? Math.max(...x_values) : 1;
    const min_y = y_values.length ? Math.min(...y_values) : -1.5;
    const max_y = y_values.length ? Math.max(...y_values) : 1.5;
    const center_x = (min_x + max_x) / 2;
    const center_y = (min_y + max_y) / 2;
    const aspect_ratio = Math.max(0.001, height_px / Math.max(1, width_px));
    const x_range = Math.max(max_x - min_x, 0.001);
    const y_range = Math.max(max_y - min_y, 0.001);
    const extent = Math.max(x_range, y_range / aspect_ratio) * 1.1;
    return {
      center_x,
      center_y,
      extent,
      y_extent: extent * aspect_ratio,
    };
  };

  render() {
    const {
      width_px,
      height_px,
      animation_index = 0,
      animation_running = false,
    } = this.props;
    const chart_width_px = Math.max(1, Math.round(width_px));
    const chart_height_px = Math.max(1, Math.round(height_px));
    const steps = this.get_steps();
    const path_points = sample_video_path(steps);
    const focal_points = steps
      .map((step) => step.focal_point)
      .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
      .map((point) => ({ x: point.x, y: point.y }));
    const animation_point = animation_running
      ? path_points[
          Math.min(Math.max(0, animation_index), path_points.length - 1)
        ]
      : null;
    const bounds = this.get_chart_bounds(
      [...path_points, ...focal_points],
      chart_width_px,
      chart_height_px,
    );
    const plot_width_px = Math.max(
      1,
      this.state.plot_area?.width || chart_width_px,
    );
    const plot_height_px = Math.max(
      1,
      this.state.plot_area?.height || chart_height_px,
    );
    const raster_scope = bounds.extent * (chart_width_px / plot_width_px);
    const raster_y_extent =
      bounds.y_extent * (chart_height_px / plot_height_px);
    const raster_aspect_ratio = raster_y_extent / raster_scope;
    return (
      <CoolStyles.Block
        style={{
          width: `${chart_width_px}px`,
          height: `${chart_height_px}px`,
          minWidth: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {path_points.length ? (
          <CoolStyles.Block
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.25,
              pointerEvents: "none",
            }}
          >
            <FractoRasterImage
              width_px={chart_width_px}
              focal_point={{ x: bounds.center_x, y: bounds.center_y }}
              scope={raster_scope}
              aspect_ratio={Math.max(0.001, raster_aspect_ratio)}
            />
          </CoolStyles.Block>
        ) : null}
        <CoolStyles.Block
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            height: "100%",
          }}
        >
          <Line
            ref={this.set_chart_instance}
            data={{
              datasets: [
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
                        borderColor: "#333333",
                        backgroundColor: "#ffcc33",
                        borderWidth: 1,
                        pointRadius: 5,
                        pointHoverRadius: 6,
                        showLine: false,
                        parsing: false,
                        order: -1,
                      },
                    ]
                  : []),
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              plugins: { legend: { display: false } },
              scales: {
                x: {
                  display: false,
                  type: "linear",
                  min: bounds.center_x - bounds.extent / 2,
                  max: bounds.center_x + bounds.extent / 2,
                  ticks: { display: false },
                  title: { display: false },
                  border: { display: false },
                  grid: { display: false },
                },
                y: {
                  display: false,
                  min: bounds.center_y - bounds.y_extent / 2,
                  max: bounds.center_y + bounds.y_extent / 2,
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
  }
}

export default VideoComplexPathChart;
