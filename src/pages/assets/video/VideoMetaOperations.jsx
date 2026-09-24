import React, { Component } from "react";
import PropTypes from "prop-types";

import AppText from "../../../AppText.jsx";
import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import CoolTabs from "../../../utils/ui/CoolTabs.jsx";
import VideoMetaData from "./VideoMetaData.jsx";
import VideoMetaPath from "./VideoMetaPath.jsx";
import VideoMetaPreview from "./VideoMetaPreview.jsx";
import VideoMetaRender from "./VideoMetaRender.jsx";
import VideoMetaProjects from "./VideoMetaProjects.jsx";
import VideoMetaSettings from "./VideoMetaSettings.jsx";
import {
  KEY_VIDEO_ASSETS_SETTINGS,
  KEY_VIDEO_ASSETS_PATHS,
  KEY_VIDEO_ASSETS_RENDER,
  KEY_VIDEO_ASSETS_PROJECTS,
} from "../../../text/AssetsText.jsx";

const TAB_HEADER_HEIGHT_PX = 32;

/**
 * Operations for editing video metadata and preview settings.
 *
 * The parent owns the splitter geometry and supplies this block with its
 * exact available dimensions so the metadata panel can remain block-oriented.
 */
export class VideoMetaOperations extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
    selected_video: PropTypes.object,
    on_video_change: PropTypes.func,
    on_video_select: PropTypes.func,
    on_new_video: PropTypes.func,
    selected_step_index: PropTypes.number,
  };

  state = {
    tab_index: 0,
  };

  on_tab_select = (tab_index) => {
    this.setState({ tab_index });
  };

  render_tab = (tab_index) => {
    const {
      width_px,
      height_px,
      selected_video,
      on_video_change,
      on_video_select,
      on_new_video,
      selected_step_index,
    } = this.props;
    const content_width = Math.max(0, width_px - 3);
    const content_height = Math.max(0, height_px - TAB_HEADER_HEIGHT_PX + 1);
    switch (tab_index) {
      case 0:
        return (
          <VideoMetaSettings
            width_px={content_width}
            height_px={content_height}
            selected_video={selected_video}
            on_video_change={on_video_change}
            selected_step_index={selected_step_index}
          />
        );
      case 1:
        return (
          <VideoMetaPath
            width_px={content_width}
            height_px={content_height}
            selected_video={selected_video}
            on_video_change={on_video_change}
          />
        );
      case 2:
        return (
          <VideoMetaPreview
            width_px={content_width}
            height_px={content_height}
            selected_video={selected_video}
            on_video_change={on_video_change}
          />
        );
      case 3:
        return (
          <VideoMetaRender
            width_px={content_width}
            height_px={content_height}
            selected_video={selected_video}
            on_video_change={on_video_change}
          />
        );
      case 4:
        return (
          <VideoMetaData
            width_px={content_width}
            height_px={content_height}
            selected_video={selected_video}
            on_video_change={on_video_change}
          />
        );
      case 5:
        return (
          <VideoMetaProjects
            width_px={content_width}
            height_px={content_height}
            selected_video={selected_video}
            on_video_change={on_video_change}
            on_video_select={on_video_select}
            on_new_video={on_new_video}
          />
        );
      default:
        console.error("VideoMetaOperations: unknown tab index", tab_index);
        return null;
    }
  };

  render() {
    const { width_px, height_px } = this.props;
    const { tab_index } = this.state;
    const selected_content = this.render_tab(tab_index);
    return (
      <CoolStyles.Block
        style={{
          width: `${width_px}px`,
          height: `${height_px}px`,
        }}
      >
        <CoolTabs
          labels={[
            AppText.get(KEY_VIDEO_ASSETS_SETTINGS),
            AppText.get(KEY_VIDEO_ASSETS_PATHS),
            "preview",
            AppText.get(KEY_VIDEO_ASSETS_RENDER),
            "meta",
            AppText.get(KEY_VIDEO_ASSETS_PROJECTS),
          ]}
          tab_index={tab_index}
          on_tab_select={this.on_tab_select}
          selected_content={selected_content}
          width_px={width_px}
        />
      </CoolStyles.Block>
    );
  }
}

export default VideoMetaOperations;
