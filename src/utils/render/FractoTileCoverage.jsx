import React, { Component } from "react";
import PropTypes from "prop-types";

import CoolStyles from "../ui/styles/CoolStyles.jsx";
import AppSettings from "../../AppSettings.jsx";
import { KEY_NAVIGATOR_DISABLED } from "../../settings/NavigatorSettings.jsx";
import AppText from "../../AppText.jsx";
import { KEY_HEAT_MAP_FETCHING } from "../../text/NavigatorText.jsx";

import FractoCanvasBuffer from "@fracto/sdk/FractoCanvasBuffer.js";
import TilesBackend from "../../backend/TilesBackend.jsx";

export const INCLUDE_CAN_DO = "include_can_do";

export class FractoTileCoverage extends Component {
  static propTypes = {
    bounding_rect: PropTypes.object.isRequired,
    frame_settings: PropTypes.object.isRequired,
    frame_settings_key: PropTypes.string.isRequired,
    on_coverage_data: PropTypes.func.isRequired,
    options: PropTypes.array,
    selected_levels: PropTypes.array,
  };

  state = {
    canvas_ref: React.createRef(),
    subscription: null,
    stored_width_px: 1,
    stored_scope: 1,
    stored_focal_point_x: 1,
    stored_focal_point_y: 1,
    in_fetch: false,
    heat_map_buffer: [],
    coverage_data: [],
  };

  subscribed_settings_signature = null;
  last_requested_settings_signature = null;

  get_settings_signature = (frame_settings) => {
    const focal_point = frame_settings?.focal_point || {};
    return [
      frame_settings?.width_px,
      frame_settings?.scope,
      focal_point.x,
      focal_point.y,
    ].join("|");
  };

  componentDidMount() {
    const { canvas_ref } = this.state;
    const { frame_settings, frame_settings_key } = this.props;
    const canvas = canvas_ref.current;
    let ctx = null;
    if (canvas) {
      ctx = canvas.getContext("2d");
    } else {
      console.log("FractoHeatMap no canvas");
    }
    this.setState({
      ctx,
      stored_scope: frame_settings.scope,
      stored_focal_point_x: frame_settings.focal_point?.x,
      stored_focal_point_y: frame_settings.focal_point?.y,
      stored_width_px: frame_settings.width_px,
      subscription: AppSettings.subscribe(
        frame_settings_key,
        this.on_frame_settings_changed,
      ),
    }, this.generate_heat_map);
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const { ctx } = this.state;
    if (this.props.selected_levels !== prevProps.selected_levels) {
      this.render_heat_map();
    }
    const { frame_settings } = this.props;
    const previous_frame_settings = prevProps.frame_settings || {};
    const focal_point = frame_settings.focal_point || {};
    const previous_focal_point = previous_frame_settings.focal_point || {};
    const width_changed =
      this.state.stored_width_px !== frame_settings.width_px ||
      previous_frame_settings.width_px !== frame_settings.width_px;
    const scope_changed = this.state.stored_scope !== frame_settings.scope;
    const focal_point_x_changed =
      this.state.stored_focal_point_x !== focal_point.x ||
      previous_focal_point.x !== focal_point.x;
    const focal_point_y_changed =
      this.state.stored_focal_point_y !== focal_point.y ||
      previous_focal_point.y !== focal_point.y;
    const scope_prop_changed =
      previous_frame_settings.scope !== frame_settings.scope;
    const settings_signature = this.get_settings_signature(frame_settings);
    if (this.subscribed_settings_signature === settings_signature) {
      this.subscribed_settings_signature = null;
      return;
    }
    if (
      width_changed ||
      scope_changed ||
      scope_prop_changed ||
      focal_point_x_changed ||
      focal_point_y_changed
    ) {
      this.setState({
        stored_scope: frame_settings.scope,
        stored_focal_point_x: focal_point.x,
        stored_focal_point_y: focal_point.y,
        stored_width_px: frame_settings.width_px,
      });
      this.generate_heat_map();
    }
  }

  componentWillUnmount() {
    const { subscription } = this.state;
    if (subscription) {
      AppSettings.unsubscribe(subscription);
    }
  }

  clear_canvas = (ctx, frame_settings, text) => {
    const { on_coverage_data } = this.props;
    if (!ctx) {
      console.log("clear_canvas no ctx");
      return;
    }
    this.setState({ coverage_data: [] });
    if (on_coverage_data) {
      on_coverage_data(null);
    }
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, frame_settings.width_px, frame_settings.width_px);
    ctx.fillStyle = "black";
    ctx.font = `italic ${16}px Arial`;
    ctx.textAlign = "center"; // Center text on the x coordinate
    ctx.fillText(
      text,
      frame_settings.width_px / 2,
      frame_settings.width_px / 2,
    );
  };

  on_frame_settings_changed = (key, value) => {
    if (!value) {
      return;
    }
    this.subscribed_settings_signature = this.get_settings_signature(value);
    this.generate_heat_map(value);
  };

  generate_heat_map = async (frame_settings_override = null) => {
    const { ctx } = this.state;
    const { frame_settings: prop_frame_settings, on_coverage_data } =
      this.props;
    const frame_settings = frame_settings_override || prop_frame_settings;
    const disabled = AppSettings.get(KEY_NAVIGATOR_DISABLED);
    if (
      disabled ||
      !frame_settings?.width_px ||
      !frame_settings?.scope ||
      !frame_settings?.focal_point
    ) {
      return;
    }
    const settings_signature = this.get_settings_signature(frame_settings);
    if (this.last_requested_settings_signature === settings_signature) {
      return;
    }
    this.last_requested_settings_signature = settings_signature;
    this.clear_canvas(ctx, frame_settings, AppText.get(KEY_HEAT_MAP_FETCHING));
    this.setState({ in_fetch: true });
    const result = await TilesBackend.get_heat_map(frame_settings);
    console.log("TilesBackend.get_heat_map result", result);
    this.render_heat_map(result.heat_map_buffer);
    this.setState({
      heat_map_buffer: result.heat_map_buffer,
      coverage_data: result.coverage,
    });
    if (on_coverage_data) {
      on_coverage_data(result.coverage, result.heat_map_buffer);
    }
    this.setState({ in_fetch: false });
  };

  render_heat_map = (heat_map_buffer = this.state.heat_map_buffer) => {
    const { ctx } = this.state;
    const { selected_levels } = this.props;
    FractoCanvasBuffer.buffer_to_canvas(
      heat_map_buffer,
      ctx,
      1,
      true,
      selected_levels,
    );
  };


  render() {
    const { canvas_ref, in_fetch, coverage_data } = this.state;
    const { frame_settings } = this.props;
    const canvas_block_style = {
      height: `${frame_settings.width_px}px`,
      width: `${frame_settings.width_px}px`,
      cursor: in_fetch ? "wait" : "default",
      border: "1px solid #666666",
      borderRadius: "0.25rem",
      boxShadow: "0.5rem 0.5rem 1rem rgba(0, 0, 0, 0.2)",
    };
    return (
      <CoolStyles.InlineBlock
        key={"heat-map"}
        title={in_fetch ? "please be patient" : "heat map"}
      >
        <CoolStyles.InlineBlock
          style={canvas_block_style}
        >
          <canvas
            ref={canvas_ref}
            width={frame_settings.width_px}
            height={frame_settings.width_px}
          />
        </CoolStyles.InlineBlock>
      </CoolStyles.InlineBlock>
    );
  }
}

export default FractoTileCoverage;
