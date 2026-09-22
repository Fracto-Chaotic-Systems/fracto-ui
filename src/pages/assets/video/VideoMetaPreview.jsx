import React, { Component } from "react";
import PropTypes from "prop-types";

import AppText from "../../../AppText.jsx";
import CoolStyles, {
  CELL_LABEL_STYLE,
} from "../../../utils/ui/styles/CoolStyles.jsx";
import CoolButton from "../../../utils/ui/CoolButton.jsx";
import FractoRasterImage from "../../../utils/render/FractoRasterImage.jsx";
import { IMAGE_FRAME_STYLE } from "../../../utils/render/ImageFrameStyle.jsx";
import VideoComplexPathChart, {
  get_video_frame_at,
  get_video_steps,
  sample_video_path,
} from "./VideoComplexPathChart.jsx";
import {
  KEY_VIDEO_ASSETS_PREVIEW_START,
  KEY_VIDEO_ASSETS_PREVIEW_STOP,
  KEY_VIDEO_ASSETS_PREVIEW_FRAME,
  KEY_VIDEO_ASSETS_PREVIEW_T,
} from "../../../text/AssetsText.jsx";

const PREVIEW_FRAME_RATE = 10;
const PREVIEW_FRAME_INTERVAL_MS = 1000 / PREVIEW_FRAME_RATE;

/** Renders the video preview area. */
export class VideoMetaPreview extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
    selected_video: PropTypes.object,
    on_video_change: PropTypes.func,
  };

  state = {
    frame_index: 0,
    animation_running: false,
  };

  componentDidUpdate(previous_props) {
    if (previous_props.selected_video !== this.props.selected_video) {
      this.stop_preview();
      this.setState({ frame_index: 0 });
    }
  }

  componentWillUnmount() {
    if (this.preview_timer_handle) {
      clearInterval(this.preview_timer_handle);
      this.preview_timer_handle = null;
    }
  }

  advance_preview = () => {
    const path_points = sample_video_path(
      get_video_steps(this.props.selected_video),
    );
    if (path_points.length < 2) {
      return;
    }
    this.setState((previous_state) => ({
      frame_index: (previous_state.frame_index + 1) % path_points.length,
    }));
  };

  stop_preview = () => {
    if (this.preview_timer_handle) {
      clearInterval(this.preview_timer_handle);
      this.preview_timer_handle = null;
    }
    this.setState({ animation_running: false });
  };

  toggle_preview = () => {
    if (this.state.animation_running) {
      this.stop_preview();
      return;
    }
    const path_points = sample_video_path(
      get_video_steps(this.props.selected_video),
    );
    if (path_points.length < 2) {
      return;
    }
    this.preview_timer_handle = setInterval(
      this.advance_preview,
      PREVIEW_FRAME_INTERVAL_MS,
    );
    this.setState({ animation_running: true });
  };

  render_preview_raster = (width_px, height_px) => {
    const steps = get_video_steps(this.props.selected_video);
    const path_points = sample_video_path(steps);
    const frame = get_video_frame_at(steps, this.state.frame_index);
    const frame_size_px = Math.max(
      0,
      Math.floor(Math.min(width_px - 10, height_px - 10)),
    );
    const size_px = Math.max(0, frame_size_px - 3);
    if (!frame || !path_points.length || size_px <= 0) {
      return null;
    }
    return (
      <CoolStyles.Block
        style={{
          ...IMAGE_FRAME_STYLE,
          width: `${frame_size_px}px`,
          height: `${frame_size_px}px`,
          flex: `0 0 ${frame_size_px}px`,
          boxSizing: "border-box",
          verticalAlign: "top",
        }}
      >
        <FractoRasterImage
          width_px={size_px}
          focal_point={frame.focal_point}
          scope={frame.scope}
          aspect_ratio={1}
        />
      </CoolStyles.Block>
    );
  };

  render() {
    const { width_px, height_px, selected_video } = this.props;
    const { animation_running } = this.state;
    const left_width_px = Math.max(0, Math.floor(width_px / 2));
    const right_width_px = Math.max(0, width_px - left_width_px);
    const path_points = sample_video_path(get_video_steps(selected_video));
    const preview_elapsed_seconds = this.state.frame_index / PREVIEW_FRAME_RATE;
    return (
      <CoolStyles.Block
        style={{ width: `${width_px}px`, height: `${height_px}px` }}
      >
        <CoolStyles.Block
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
        >
          <CoolStyles.Block
            style={{
              width: `${left_width_px}px`,
              height: `${height_px}px`,
              flex: `0 0 ${left_width_px}px`,
              boxSizing: "border-box",
              padding: "5px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "flex-start",
            }}
          >
            {this.render_preview_raster(left_width_px, height_px) ||
              `VideoMetaPreview ${left_width_px}x${height_px}`}
            <CoolButton
              content={
                animation_running
                  ? AppText.get(KEY_VIDEO_ASSETS_PREVIEW_STOP)
                  : AppText.get(KEY_VIDEO_ASSETS_PREVIEW_START)
              }
              primary={true}
              on_click={this.toggle_preview}
              disabled={path_points.length < 2}
              style={{
                marginTop: "1rem",
                marginRight: 0,
                alignSelf: "center",
              }}
            />
            <CoolStyles.Block
              style={{ alignSelf: "center", marginTop: "0.25rem" }}
            >
              <CoolStyles.Block
                style={{ ...CELL_LABEL_STYLE, textAlign: "center" }}
              >
                {`${AppText.get(KEY_VIDEO_ASSETS_PREVIEW_FRAME)} = ${this.state.frame_index}`}
              </CoolStyles.Block>
              <CoolStyles.Block
                style={{
                  ...CELL_LABEL_STYLE,
                  textAlign: "center",
                  marginTop: "-0.125rem",
                }}
              >
                {`${AppText.get(KEY_VIDEO_ASSETS_PREVIEW_T)} = ${preview_elapsed_seconds.toFixed(1)}s`}
              </CoolStyles.Block>
            </CoolStyles.Block>
          </CoolStyles.Block>
          <CoolStyles.Block
            style={{
              width: `${right_width_px}px`,
              height: `${height_px}px`,
              flex: `0 0 ${right_width_px}px`,
              boxSizing: "border-box",
              padding: "5px",
            }}
          >
            <CoolStyles.Block
              style={{
                ...IMAGE_FRAME_STYLE,
                boxSizing: "border-box",
                width: `${Math.max(0, right_width_px - 10)}px`,
                height: `${Math.max(0, height_px - 10)}px`,
              }}
            >
              <VideoComplexPathChart
                width_px={Math.max(0, right_width_px - 13)}
                height_px={Math.max(0, height_px - 13)}
                selected_video={selected_video}
                animation_index={this.state.frame_index}
                animation_running={animation_running}
              />
            </CoolStyles.Block>
          </CoolStyles.Block>
        </CoolStyles.Block>
      </CoolStyles.Block>
    );
  }
}

export default VideoMetaPreview;
