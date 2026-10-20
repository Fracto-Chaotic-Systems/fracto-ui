import React, { Component } from "react";
import FractoUtil from "@fracto/sdk/FractoUtil.js";
import MinibrotRayTable from "./MinibrotRayTable.jsx";
import PropTypes from "prop-types";
import AppText from "../../../AppText.jsx";
import {
  MINIBROT_RAY_TEXT,
  KEY_STUDY_MINIBROT_CONTEXT_CANVAS,
} from "../../../text/StudyText.jsx";
import FractoRasterImage from "../../../utils/render/FractoRasterImage.jsx";
import { IMAGE_FRAME_STYLE } from "../../../utils/render/ImageFrameStyle.jsx";
import { paint_canvas_rays } from "../../../utils/render/FractoRayOverlay.js";

/** The parent keys this component by record and saved view. */
export default class MinibrotContextCanvas extends Component {
  static propTypes = {
    core_point: PropTypes.object.isRequired,
    period: PropTypes.number.isRequired,
    focal_point: PropTypes.object.isRequired,
    scope: PropTypes.number.isRequired,
  };
  state = { status: "attachment", selected_relative: "antenna_tip" };
  active = false;
  rays = [];
  componentDidMount() {
    this.active = true;
    try {
      this.worker = new Worker(
        new URL("./MinibrotRays.worker.js", import.meta.url),
        { type: "module" },
      );
      this.worker.onmessage = ({ data }) => {
        if (!this.active) return;
        if (data.progress) this.setState({ status: data.progress });
        if (data.result) {
          this.rays = data.result.rays;
          this.setState(
            {
              status: data.result.status,
              ray_groups: {
                "0/1": data.result.root_access,
                "1/2": data.result.doubling,
                "1/3": data.result.thirds?.["1/3"],
                "2/3": data.result.thirds?.["2/3"],
                antenna_tip: data.result.antenna_tip,
              },
              tip_status: data.result.antenna_tip?.status,
              root_status: data.result.root_access?.status,
              doubling_status: data.result.doubling?.status,
              third_one_status: data.result.thirds?.["1/3"]?.status,
              third_two_status: data.result.thirds?.["2/3"]?.status,
            },
            this.paint,
          );
          this.worker?.terminate();
          this.worker = null;
        }
      };
      this.worker.onerror = () => {
        if (this.active) {
          this.setState({ status: "unavailable" });
          this.worker?.terminate();
          this.worker = null;
        }
      };
      this.worker.postMessage({
        ...this.props,
        tolerance: this.props.scope / 1000,
      });
    } catch {
      this.worker?.terminate();
      this.worker = null;
      this.setState({ status: "unavailable" });
    }
  }
  componentWillUnmount() {
    this.active = false;
    this.worker?.terminate();
    this.worker = null;
    this.canvas_context = null;
    this.base = null;
  }
  on_complete = (_buffer, context) => {
    if (!this.active) return;
    this.canvas_context = context;
    this.base = context.getImageData(0, 0, 500, 500);
    this.paint();
  };
  select_relative = (selected_relative) => {
    this.setState({ selected_relative }, this.paint);
  };
  paint = () => {
    if (!this.active || !this.canvas_context || !this.base) return;
    const { focal_point, scope } = this.props;
    this.canvas_context.putImageData(this.base, 0, 0);
    const centered = this.rays.map((ray) => ({
      ...ray,
      points: ray.points.map((p) => ({
        x: p.x - focal_point.x,
        y: p.y - focal_point.y,
      })),
    }));
    paint_canvas_rays(
      this.canvas_context,
      this.canvas_context.canvas,
      centered,
      scope / 2,
      "#ffffff",
      false,
    );
    const relative = this.state.selected_relative;
    const selected = this.state.ray_groups?.[relative]?.rays || [];
    const denominator =
      relative === "antenna_tip" ? 1 : Number(relative.split("/")[1]);
    if (selected.length) {
      const selected_angles = new Set(selected.map((ray) => ray.angle.key));
      paint_canvas_rays(
        this.canvas_context,
        this.canvas_context.canvas,
        centered.filter((ray) => selected_angles.has(ray.angle.key)),
        scope / 2,
        FractoUtil.fracto_pattern_color(this.props.period * denominator, 10000),
      );
    }
  };
  render_partial_reasons = () => {
    if (this.state.status !== "partial") return null;
    return [
      { label: "tip_label", status: this.state.tip_status },
      { label: "root_access_label", status: this.state.root_status },
      { label: "doubling_label", status: this.state.doubling_status },
      { label: "third_one_label", status: this.state.third_one_status },
      { label: "third_two_label", status: this.state.third_two_status },
    ]
      .filter((group) => group.status && group.status !== "complete")
      .map((group) => (
        <div key={group.label}>
          {AppText.get(MINIBROT_RAY_TEXT[group.label])}:{" "}
          {AppText.get(
            MINIBROT_RAY_TEXT[group.status] || MINIBROT_RAY_TEXT.unresolved,
          )}
        </div>
      ));
  };
  render() {
    const { focal_point, scope } = this.props;
    return (
      <div style={{ marginTop: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div
            role="img"
            aria-label={AppText.get(KEY_STUDY_MINIBROT_CONTEXT_CANVAS)}
            style={{
              ...IMAGE_FRAME_STYLE,
              boxSizing: "content-box",
              width: 500,
              height: 500,
              flexShrink: 0,
            }}
          >
            <FractoRasterImage
              width_px={500}
              aspect_ratio={1}
              focal_point={focal_point}
              scope={scope}
              on_plan_complete={this.on_complete}
            />
          </div>
          <MinibrotRayTable
            period={this.props.period}
            groups={this.state.ray_groups}
            selected_relative={this.state.selected_relative}
            on_select={this.select_relative}
          />
        </div>
        <div role="status" style={{ marginTop: "0.5rem" }}>
          {AppText.get(
            MINIBROT_RAY_TEXT[this.state.status] ||
              MINIBROT_RAY_TEXT.unresolved,
          )}
          {this.render_partial_reasons()}
        </div>
      </div>
    );
  }
}
