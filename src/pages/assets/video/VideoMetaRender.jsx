import React, { Component } from "react";
import PropTypes from "prop-types";

import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import CoolButton from "../../../utils/ui/CoolButton.jsx";
import AppText from "../../../AppText.jsx";
import { AssetsBackend } from "../../../backend/AssetsBackend.jsx";
import {
  KEY_VIDEO_ASSETS_RENDER_ASSEMBLE,
  KEY_VIDEO_ASSETS_RENDER_NO_VIDEO,
  KEY_VIDEO_ASSETS_RENDER_OPEN_OUTPUT,
  KEY_VIDEO_ASSETS_RENDER_OUTPUT,
  KEY_VIDEO_ASSETS_RENDER_PROGRESS,
  KEY_VIDEO_ASSETS_RENDER_RETRY,
  KEY_VIDEO_ASSETS_RENDER_START,
  KEY_VIDEO_ASSETS_RENDER_STATUS,
  KEY_VIDEO_ASSETS_RENDER_STOP,
} from "../../../text/AssetsText.jsx";

const STATUS_POLL_INTERVAL_MS = 2000;
const ACTIVE_STATES = new Set(["queued", "running", "encoding"]);

/** Renders the video render-configuration area. */
export class VideoMetaRender extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
    selected_video: PropTypes.object,
    on_video_change: PropTypes.func,
  };

  state = {
    render_status: null,
    loading: false,
    error: null,
  };

  componentDidMount() {
    this.refresh_status();
    this.status_timer = window.setInterval(
      this.refresh_status,
      STATUS_POLL_INTERVAL_MS,
    );
  }

  componentDidUpdate(prevProps) {
    const previous_id = prevProps.selected_video?.id;
    const current_id = this.props.selected_video?.id;
    if (previous_id !== current_id) {
      this.setState({ render_status: null, error: null }, this.refresh_status);
    }
  }

  componentWillUnmount() {
    this._unmounted = true;
    if (this.status_timer) window.clearInterval(this.status_timer);
  }

  refresh_status = async (force = false) => {
    const video_id = this.props.selected_video?.id;
    if (!video_id || (this.state.loading && !force)) return;
    try {
      const render_status = await AssetsBackend.render_status(video_id);
      if (this._unmounted) return;
      this.setState({ render_status, error: null });
    } catch (error) {
      if (!this._unmounted) this.setState({ error: error.message });
    }
  };

  on_render_action = async () => {
    const video_id = this.props.selected_video?.id;
    if (!video_id || this.state.loading) return;
    const state = this.state.render_status?.render_state || "idle";
    let action;
    if (ACTIVE_STATES.has(state)) {
      action = AssetsBackend.cancel_video_render;
    } else if (state === "frames_ready") {
      action = AssetsBackend.assemble_video_render;
    } else if (state === "failed" || state === "cancelled") {
      action = AssetsBackend.retry_video_render;
    } else {
      action = AssetsBackend.start_video_render;
    }
    this.setState({ loading: true, error: null });
    try {
      await action(video_id);
      await this.refresh_status(true);
    } catch (error) {
      if (!this._unmounted) this.setState({ error: error.message });
    } finally {
      if (!this._unmounted) this.setState({ loading: false });
    }
  };

  render_action_label = (state) => {
    if (ACTIVE_STATES.has(state)) return AppText.get(KEY_VIDEO_ASSETS_RENDER_STOP);
    if (state === "frames_ready") {
      return AppText.get(KEY_VIDEO_ASSETS_RENDER_ASSEMBLE);
    }
    if (state === "failed" || state === "cancelled") {
      return AppText.get(KEY_VIDEO_ASSETS_RENDER_RETRY);
    }
    return AppText.get(KEY_VIDEO_ASSETS_RENDER_START);
  };

  render() {
    const { width_px, height_px, selected_video } = this.props;
    const { render_status, loading, error } = this.state;
    const state = render_status?.render_state || "idle";
    const progress = Number(render_status?.render_progress) || 0;
    if (!selected_video?.id) {
      return (
        <CoolStyles.Block
          style={{ width: `${width_px}px`, height: `${height_px}px` }}
        >
          {AppText.get(KEY_VIDEO_ASSETS_RENDER_NO_VIDEO)}
        </CoolStyles.Block>
      );
    }
    return (
      <CoolStyles.Block
        style={{
          width: `${width_px}px`,
          height: `${height_px}px`,
          padding: "1rem",
          boxSizing: "border-box",
        }}
      >
        <CoolButton
          content={this.render_action_label(state)}
          on_click={this.on_render_action}
          primary={!ACTIVE_STATES.has(state)}
          disabled={loading}
        />
        <CoolStyles.Block style={{ marginTop: "0.75rem" }}>
          <strong>{AppText.get(KEY_VIDEO_ASSETS_RENDER_STATUS)}:</strong>{" "}
          {state}
        </CoolStyles.Block>
        <CoolStyles.Block style={{ marginTop: "0.25rem" }}>
          <strong>{AppText.get(KEY_VIDEO_ASSETS_RENDER_PROGRESS)}:</strong>{" "}
          {progress}%
        </CoolStyles.Block>
        {render_status?.render_output_uri ? (
          <CoolStyles.Block
            style={{ marginTop: "0.25rem", overflowWrap: "anywhere" }}
          >
            <strong>{AppText.get(KEY_VIDEO_ASSETS_RENDER_OUTPUT)}:</strong>{" "}
            {render_status.render_state === "completed" ? (
              <a
                href={AssetsBackend.video_render_output_url(selected_video.id)}
                target="_blank"
                rel="noreferrer"
              >
                {AppText.get(KEY_VIDEO_ASSETS_RENDER_OPEN_OUTPUT)}
              </a>
            ) : (
              render_status.render_output_uri
            )}
          </CoolStyles.Block>
        ) : null}
        {error || render_status?.render_error ? (
          <CoolStyles.Block style={{ color: "#aa0000", marginTop: "0.5rem" }}>
            {error || render_status.render_error}
          </CoolStyles.Block>
        ) : null}
      </CoolStyles.Block>
    );
  }
}

export default VideoMetaRender;
