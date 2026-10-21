import MinibrotRayStorage from "./MinibrotRayStorage.js";
import {
  best_ray_group,
  cached_ray_result,
} from "@fracto/sdk/orbitals/FractoMinibrotRayCache.js";
import React, { Component } from "react";
import { format_minibrot_angle } from "./MinibrotRayLabels.js";
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
    minibrot_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    core_point: PropTypes.object.isRequired,
    period: PropTypes.number.isRequired,
    focal_point: PropTypes.object.isRequired,
    scope: PropTypes.number.isRequired,
  };
  state = {
    focal_point: { ...this.props.focal_point },
    scope: this.props.scope,
    view_id: 0,
    status: "attachment",
    selected_relative: "antenna_tip",
    elapsed_seconds: 0,
    calculating: true,
  };
  active = false;
  rays = [];
  view_id = 0;
  set_display_canvas = (canvas) => {
    this.display_context = canvas?.getContext("2d") || null;
    if (this.display_context && this.view_id === 0 && !this.base) {
      // Cached paths can arrive before the initial background raster.
      this.canvas_context = this.display_context;
      this.base = this.display_context.getImageData(0, 0, 500, 500);
      this.paint();
    }
  };
  set_canvas_wrapper = (element) => {
    this.canvas_wrapper?.removeEventListener("wheel", this.on_wheel);
    this.canvas_wrapper = element;
    element?.addEventListener("wheel", this.on_wheel, { passive: false });
  };
  change_view = (focal_point, scope) => {
    if (!this.active || !Number.isFinite(scope) || scope <= 0) return;
    this.canvas_context = null;
    this.base = null;
    this.setState({ focal_point, scope, view_id: ++this.view_id });
  };
  on_wheel = (event) => {
    event.preventDefault();
    if (!event.deltaY) return;
    const factor = event.altKey ? 1.618 : event.shiftKey ? 1.618 ** 2 : 1.5;
    const { focal_point, scope } = this.state;
    this.change_view(
      focal_point,
      event.deltaY > 0 ? scope * factor : scope / factor,
    );
  };
  on_click = (event) => {
    const bounds = this.canvas_wrapper
      ?.querySelector("canvas")
      ?.getBoundingClientRect();
    if (!bounds?.width || !bounds.height) return;
    const { focal_point, scope } = this.state;
    this.change_view(
      {
        x:
          focal_point.x +
          ((event.clientX - bounds.left) / bounds.width - 0.5) * scope,
        y:
          focal_point.y +
          (0.5 - (event.clientY - bounds.top) / bounds.height) * scope,
      },
      scope,
    );
  };
  componentDidMount() {
    this.active = true;
    this.started_at = Date.now();
    this.progress_timer = setInterval(() => {
      if (this.active)
        this.setState({
          elapsed_seconds: Math.floor((Date.now() - this.started_at) / 1000),
        });
    }, 1000);
    if (this.props.minibrot_id) {
      this.storage = new MinibrotRayStorage(this.props);
      this.load_cache();
    } else this.start_worker();
  }
  load_cache = async () => {
    this.setState({ status: "cache_loading" });
    let cache;
    try {
      cache = await this.storage.load();
      if (!this.active) return;
      if (cache) {
        const result = cached_ray_result(cache, this.props.scope / 1000);
        this.apply_result(result, result.status === "complete");
        this.setState({ cache_status: "cache_loaded" });
        if (result.status === "complete") return;
      }
    } catch {
      if (!this.active) return;
      this.setState({ cache_status: "cache_load_failed" });
    }
    if (this.active) this.start_worker(cache);
  };
  save_group = (group, result) => {
    if (!this.storage) return;
    this.pending_saves = (this.pending_saves || 0) + 1;
    this.setState({ cache_status: "cache_saving" });
    this.storage
      .save(group, result)
      .catch(() => {
        this.save_failed = true;
      })
      .finally(() => {
        this.pending_saves--;
        if (this.active && !this.pending_saves)
          this.setState({
            cache_status: this.save_failed
              ? "cache_save_failed"
              : this.rays.length
                ? "cache_saved"
                : "cache_no_paths",
          });
      });
  };
  apply_result = (result, finished = true) => {
    if (finished) clearInterval(this.progress_timer);
    this.rays = result.rays;
    this.setState(
      {
        status: result.status,
        calculating: !finished,
        ray_groups: {
          "0/1": result.root_access,
          "1/2": result.doubling,
          "1/3": result.thirds?.["1/3"],
          "2/3": result.thirds?.["2/3"],
          antenna_tip: result.antenna_tip,
        },
        tip_status: result.antenna_tip?.status,
        root_status: result.root_access?.status,
        doubling_status: result.doubling?.status,
        third_one_status: result.thirds?.["1/3"]?.status,
        third_two_status: result.thirds?.["2/3"]?.status,
      },
      this.paint,
    );
  };
  start_worker = (cache) => {
    this.display_cache = { groups: { ...cache?.groups } };
    try {
      this.worker = new Worker(
        new URL("./MinibrotRays.worker.js", import.meta.url),
        { type: "module" },
      );
      this.worker.onmessage = ({ data }) => {
        if (!this.active) return;
        if (data.progress) this.setState({ status: data.progress });
        if (data.group) {
          const { id, result } = data.group;
          this.display_cache.groups[id] = best_ray_group(
            this.display_cache.groups[id],
            { result, tolerance: this.props.scope / 1000 },
          );
          this.apply_result(
            {
              ...cached_ray_result(this.display_cache, this.props.scope / 1000),
              status: this.state.status,
            },
            false,
          );
          this.save_group(id, result);
        }
        if (data.result) {
          const available = cached_ray_result(
            this.display_cache,
            this.props.scope / 1000,
          );
          this.apply_result(
            data.result.rays?.length || !available.rays.length
              ? data.result
              : {
                  ...available,
                  status: available.rays.length
                    ? "partial"
                    : data.result.status,
                },
          );
          this.worker?.terminate();
          this.worker = null;
        }
      };
      this.worker.onerror = () => {
        if (this.active) {
          clearInterval(this.progress_timer);
          this.setState({ status: "unavailable", calculating: false });
          this.worker?.terminate();
          this.worker = null;
        }
      };
      this.worker.postMessage({
        ...this.props,
        tolerance: this.props.scope / 1000,
        cache,
      });
    } catch {
      this.worker?.terminate();
      this.worker = null;
      clearInterval(this.progress_timer);
      this.setState({ status: "unavailable", calculating: false });
    }
  };
  componentWillUnmount() {
    this.active = false;
    this.set_canvas_wrapper(null);
    clearInterval(this.progress_timer);
    this.worker?.terminate();
    this.worker = null;
    this.canvas_context = null;
    this.display_context = null;
    this.base = null;
  }
  on_complete = (_buffer, context, view_id = 0) => {
    if (!this.active || view_id !== this.view_id) return;
    this.canvas_context = this.display_context || context;
    this.base = context.getImageData(0, 0, 500, 500);
    this.paint();
  };
  select_relative = (selected_relative) => {
    this.setState({ selected_relative }, this.paint);
  };
  paint = () => {
    if (!this.active || !this.canvas_context || !this.base) return;
    const { focal_point, scope } = this.state;
    this.canvas_context.putImageData(this.base, 0, 0);
    const centered = this.rays.map((ray) => ({
      ...ray,
      display_label: format_minibrot_angle(
        ray.angle,
        this.props.period,
        this.state.selected_relative,
      ),
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
    if (
      this.state.status !== "partial" &&
      (this.state.calculating || this.rays.length)
    )
      return null;
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
    const { focal_point, scope, view_id } = this.state;
    const cache_status =
      this.state.cache_status === "cache_no_paths" && this.state.calculating
        ? "cache_progress_saved"
        : this.state.cache_status;
    return (
      <div style={{ marginTop: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div
            ref={this.set_canvas_wrapper}
            onClick={this.on_click}
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
            <canvas
              ref={this.set_display_canvas}
              width={500}
              height={500}
              style={{ display: "block", cursor: "crosshair" }}
            />
            <div style={{ display: "none" }} aria-hidden="true">
              <FractoRasterImage
                key={view_id}
                width_px={500}
                aspect_ratio={1}
                focal_point={focal_point}
                scope={scope}
                on_plan_complete={(buffer, context) =>
                  this.on_complete(buffer, context, view_id)
                }
              />
            </div>
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
          {this.state.calculating && (
            <div>
              {AppText.get(MINIBROT_RAY_TEXT.calculating).replace(
                "{seconds}",
                this.state.elapsed_seconds,
              )}
            </div>
          )}
          {cache_status && (
            <div>{AppText.get(MINIBROT_RAY_TEXT[cache_status])}</div>
          )}
          {this.render_partial_reasons()}
        </div>
      </div>
    );
  }
}
