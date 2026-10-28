import React, { Component, createRef } from "react";
import PropTypes from "prop-types";
import TilesBackend from "../../backend/TilesBackend.jsx";
import FractoCanvasBuffer from "@fracto/sdk/FractoCanvasBuffer.js";

import MeshHeatMapView from "./MeshHeatMapView.jsx";

const POLL_MS = 5000;
const token = (data) =>
  `${data.namespace}|${data.inventory_revision ?? data.revision}`;

export function mesh_map_params({ frame_settings: frame, width_px }) {
  const aspect = frame?.aspect_ratio ?? 1;
  if (
    !Number.isFinite(frame?.scope) ||
    frame.scope <= 0 ||
    !Number.isFinite(frame?.focal_point?.x) ||
    !Number.isFinite(frame?.focal_point?.y) ||
    !Number.isFinite(aspect) ||
    aspect <= 0
  )
    return null;
  let edge = Math.floor(
    Math.min(
      width_px - 24,
      frame.width_px || width_px - 24,
      1024,
      2048 / aspect,
      1024 / Math.sqrt(aspect),
    ),
  );
  while (
    edge > 0 &&
    (Math.round(edge * aspect) > 2048 ||
      edge * Math.round(edge * aspect) > 1048576)
  )
    edge--;
  if (!Number.isFinite(edge) || edge < 1 || Math.round(edge * aspect) < 1)
    return null;
  return {
    width_px: edge,
    focal_point_x: frame.focal_point.x,
    focal_point_y: frame.focal_point.y,
    scope: frame.scope,
    aspect_ratio: aspect,
  };
}
const signature = (props) => JSON.stringify(mesh_map_params(props));

/** Owns map requests, revision polling and level selection independently of page mode. */
export default class MeshHeatMap extends Component {
  static propTypes = {
    frame_settings: PropTypes.object.isRequired,
    width_px: PropTypes.number.isRequired,
  };
  canvas = createRef();
  alive = false;
  sequence = 0;
  revision_token = null;
  state = { result: null, loading: false, error: false, selected_levels: null };

  componentDidMount() {
    this.alive = true;
    this.load_map();
    this.timer = setTimeout(this.poll, POLL_MS);
  }
  componentDidUpdate(previous) {
    if (signature(previous) !== signature(this.props)) this.load_map();
  }
  componentWillUnmount() {
    this.alive = false;
    this.sequence++;
    clearTimeout(this.timer);
    this.map_request?.abort();
    this.inventory_request?.abort();
  }
  load_map = async (preserve_selection = false) => {
    const sequence = ++this.sequence;
    this.map_request?.abort();
    const params = mesh_map_params(this.props);
    this.setState(
      {
        result: null,
        loading: Boolean(params),
        error: false,
        ...(preserve_selection ? {} : { selected_levels: null }),
      },
      this.paint,
    );
    if (!params) return;
    const request = new AbortController();
    this.map_request = request;
    const timeout = setTimeout(() => request.abort(), 20000);
    try {
      const result = await TilesBackend.mesh_heat_map(params, {
        signal: request.signal,
      });
      if (!this.alive || sequence !== this.sequence) return;
      this.revision_token = token(result);
      this.setState({ result, loading: false, error: false }, this.paint);
    } catch {
      if (this.alive && sequence === this.sequence)
        this.setState({ loading: false, error: true });
    } finally {
      clearTimeout(timeout);
    }
  };
  poll = async () => {
    if (!this.alive) return;
    const request = new AbortController();
    this.inventory_request = request;
    const timeout = setTimeout(() => request.abort(), 20000);
    try {
      const inventory = await TilesBackend.mesh_inventory({
        signal: request.signal,
      });
      clearTimeout(timeout);
      if (
        this.alive &&
        !this.state.loading &&
        (this.state.error || token(inventory) !== this.revision_token)
      )
        await this.load_map(true);
    } catch {
      if (this.alive) this.setState({ error: true });
    } finally {
      clearTimeout(timeout);
      if (this.alive) this.timer = setTimeout(this.poll, POLL_MS);
    }
  };
  paint = () => {
    const ctx = this.canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#d9ffff";
    ctx.fillRect(0, 0, this.canvas.current.width, this.canvas.current.height);
    const { result, selected_levels } = this.state;
    if (result)
      FractoCanvasBuffer.buffer_to_canvas(
        result.heat_map_buffer,
        ctx,
        1,
        true,
        selected_levels ?? result.coverage.map((row) => row.level),
      );
  };
  select_level = (level) => {
    const selected =
      this.state.selected_levels ??
      this.state.result.coverage.map((row) => row.level);
    this.setState(
      {
        selected_levels: selected.includes(level)
          ? selected.filter((item) => item !== level)
          : [...selected, level],
      },
      this.paint,
    );
  };
  render() {
    return (
      <MeshHeatMapView
        canvas_ref={this.canvas}
        params={mesh_map_params(this.props)}
        {...this.state}
        on_retry={() => this.load_map(true)}
        on_select_level={this.select_level}
        on_select_all={(all) =>
          this.setState({ selected_levels: all ? null : [] }, this.paint)
        }
      />
    );
  }
}
