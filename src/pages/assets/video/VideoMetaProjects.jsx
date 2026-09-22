import React, { Component } from "react";
import PropTypes from "prop-types";

import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import CoolButton from "../../../utils/ui/CoolButton.jsx";
import DataBackend from "../../../backend/DataBackend.jsx";
import VideoRecordsTable from "./VideoRecordsTable.jsx";
import AppText from "../../../AppText.jsx";
import { KEY_VIDEO_ASSETS_NEW_VIDEO } from "../../../text/AssetsText.jsx";

const HEADER_HEIGHT_PX = 32;

/** Scaffold for managing related video projects from the video metadata pane. */
export class VideoMetaProjects extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
    selected_video: PropTypes.object,
    on_video_change: PropTypes.func,
    on_video_select: PropTypes.func.isRequired,
    on_new_video: PropTypes.func.isRequired,
  };

  state = {
    records: [],
  };

  componentDidMount() {
    this.load_records();
  }

  load_records = async () => {
    try {
      const response = await DataBackend.query_table("videos", 1000);
      if (!this._unmounted) this.setState({ records: response.result || [] });
    } catch (error) {
      console.error("error loading video projects", error.message);
    }
  };

  componentWillUnmount() {
    this._unmounted = true;
  }

  on_new_video = async () => {
    const { on_new_video } = this.props;
    const video = await on_new_video();
    if (!video?.id || this._unmounted) return;
    this.setState((previous_state) => ({
      records: [
        video,
        ...previous_state.records.filter((record) => record.id !== video.id),
      ],
    }));
  };

  render() {
    const { width_px, height_px, on_video_select, selected_video } = this.props;
    const content_height_px = Math.max(0, height_px - HEADER_HEIGHT_PX);
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
            height: `${HEADER_HEIGHT_PX}px`,
            width: `${width_px}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
          }}
        >
          <CoolButton
            content={AppText.get(KEY_VIDEO_ASSETS_NEW_VIDEO)}
            on_click={this.on_new_video}
            primary
            style={{ marginLeft: "0.25rem" }}
          />
        </CoolStyles.Block>
        <CoolStyles.Block
          style={{
            height: `${content_height_px}px`,
            width: `${width_px}px`,
            overflow: "auto",
          }}
        >
          <VideoRecordsTable
            records={this.state.records}
            height_px={content_height_px}
            on_select={on_video_select}
            selected_id={selected_video?.id || 0}
          />
        </CoolStyles.Block>
      </CoolStyles.Block>
    );
  }
}

export default VideoMetaProjects;
