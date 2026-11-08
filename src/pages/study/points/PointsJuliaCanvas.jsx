import React, { Component } from "react";
import SeedSurveyCanvas from "../../assets/surveys/SeedSurveyCanvas.jsx";
import { paint_survey_orbital_points } from "../../assets/surveys/SeedSurveyOrbitalOverlay.js";
import { paint_survey_rays } from "../../assets/surveys/SeedSurveyRayOverlay.js";
import PointsOrbitalRays from "./PointsOrbitalRays.jsx";

/** Restore the latest Julia image before drawing a new orbital selection. */
export default class PointsJuliaCanvas extends Component {
  state = { rays: [], ray_selection: null };
  canvas = null;
  image = null;
  selection_key = () => JSON.stringify(this.props.trace_request);
  on_rays = (rays, selection) => {
    if (selection !== this.selection_key()) return;
    this.setState({ rays, ray_selection: selection }, this.paint_overlay);
  };

  componentDidUpdate(previous) {
    if (previous.selected_orbital !== this.props.selected_orbital)
      this.paint_overlay();
  }

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
    paint_survey_rays(
      context,
      this.canvas,
      this.state.ray_selection === this.selection_key() ? this.state.rays : [],
      this.props.half_span,
      this.props.selected_orbital?.period || 0,
    );
    paint_survey_orbital_points(
      context,
      this.canvas,
      (this.props.selected_orbital?.points || []).map((point) => point.point),
      this.props.half_span,
    );
  };

  render() {
    const { selected_orbital, trace_request, ...canvas_props } = this.props;
    const selection = this.selection_key();
    return (
      <div>
        <SeedSurveyCanvas
          {...canvas_props}
          show_completion={false}
          on_canvas_rendered={this.on_canvas_rendered}
        />
        <PointsOrbitalRays
          trace_request={trace_request}
          on_rays={(rays) => this.on_rays(rays, selection)}
        />
      </div>
    );
  }
}
