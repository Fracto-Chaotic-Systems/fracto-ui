import React, { Component } from "react";
import SeedSurveyCanvas from "../../assets/surveys/SeedSurveyCanvas.jsx";
import { paint_survey_orbital_points } from "../../assets/surveys/SeedSurveyOrbitalOverlay.js";
import { paint_survey_rays } from "../../assets/surveys/SeedSurveyRayOverlay.js";
import PointsOrbitalRays from "./PointsOrbitalRays.jsx";

const RAY_FADE_MS = 120;

/** Restore the latest Julia image before drawing a new orbital selection. */
export default class PointsJuliaCanvas extends Component {
  state = { rays: [], ray_selection: null };
  canvas = null;
  image = null;
  ray_opacities = new Map();
  ray_fade = null;
  fade_frame = null;
  selection_key = () => JSON.stringify(this.props.trace_request);
  on_rays = (rays, selection) => {
    if (selection !== this.selection_key()) return;
    this.setState({ rays, ray_selection: selection }, this.paint_overlay);
  };

  componentDidUpdate(previous) {
    if (
      previous.selected_orbital !== this.props.selected_orbital ||
      previous.active_point_index !== this.props.active_point_index ||
      previous.animation_playing !== this.props.animation_playing
    ) {
      this.cancel_ray_frame();
      if (this.props.animation_playing) {
        this.update_ray_opacities();
        if (previous.selected_orbital !== this.props.selected_orbital)
          this.ray_opacities = new Map();
        this.ray_fade = {
          from: new Map(this.ray_opacities),
          target: this.props.active_point_index,
          start: performance.now(),
        };
        this.schedule_ray_frame();
      } else {
        this.ray_fade = null;
        this.ray_opacities = new Map();
      }
      this.paint_overlay();
    }
  }

  componentWillUnmount() {
    this.cancel_ray_frame();
  }

  cancel_ray_frame = () => {
    if (this.fade_frame !== null) cancelAnimationFrame(this.fade_frame);
    this.fade_frame = null;
  };

  update_ray_opacities = () => {
    if (!this.ray_fade) return;
    const { from, target, start } = this.ray_fade;
    const progress = Math.min(
      1,
      Math.max(0, (performance.now() - start) / RAY_FADE_MS),
    );
    const blend = progress * progress * (3 - 2 * progress);
    this.ray_opacities = new Map();
    for (const index of new Set([...from.keys(), target])) {
      if (!Number.isInteger(index) || index < 0) continue;
      const opacity =
        (from.get(index) || 0) * (1 - blend) + (index === target ? blend : 0);
      if (opacity > 0) this.ray_opacities.set(index, opacity);
    }
    if (progress === 1) this.ray_fade = null;
  };

  schedule_ray_frame = () => {
    this.fade_frame = requestAnimationFrame(() => {
      this.fade_frame = null;
      this.update_ray_opacities();
      this.paint_overlay();
      if (this.ray_fade && this.props.animation_playing)
        this.schedule_ray_frame();
    });
  };

  on_canvas_rendered = (canvas) => {
    const context = canvas.getContext("2d");
    if (!context) return;
    this.canvas = canvas;
    this.image = context.getImageData(0, 0, canvas.width, canvas.height);
    this.paint_overlay();
  };

  paint_overlay = () => {
    if (!this.canvas || !this.image) return;
    const context = this.canvas.getContext("2d");
    if (!context) return;
    context.putImageData(this.image, 0, 0);
    this.update_ray_opacities();
    paint_survey_rays(
      context,
      this.canvas,
      this.state.ray_selection === this.selection_key() ? this.state.rays : [],
      this.props.half_span,
      this.props.selected_orbital?.period || 0,
      this.props.animation_playing ? this.props.active_point_index : null,
      this.props.animation_playing ? this.ray_opacities : null,
    );
    paint_survey_orbital_points(
      context,
      this.canvas,
      (this.props.selected_orbital?.points || []).map((point) => point.point),
      this.props.half_span,
      this.props.animation_playing
        ? (this.props.selected_orbital?.points || []).findIndex(
            (point) => point.point_index === this.props.active_point_index,
          )
        : -1,
      !this.props.animation_playing
        ? (this.props.selected_orbital?.points || []).findIndex(
            (point) => point.point_index === this.props.active_point_index,
          )
        : -1,
    );
  };

  render() {
    const {
      selected_orbital,
      trace_request,
      active_point_index,
      animation_playing,
      ...canvas_props
    } = this.props;
    const selection = this.selection_key();
    return (
      <div>
        <SeedSurveyCanvas
          {...canvas_props}
          show_completion={false}
          on_canvas_rendered={this.on_canvas_rendered}
        />
        <PointsOrbitalRays
          selected_orbital={selected_orbital}
          trace_request={trace_request}
          on_rays={(rays) => this.on_rays(rays, selection)}
        />
      </div>
    );
  }
}
