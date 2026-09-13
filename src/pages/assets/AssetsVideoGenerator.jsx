import React, { Component } from "react";

import NavigatorCoverage from "../../navigator/NavigatorCoverage.jsx";
import { VIDEO_GENERATOR_SPLITTER_KEYS } from "../../navigator/NavigatorKeys.jsx";
import VideoControlBlock from "./video/VideoControlBlock.jsx";

import {
  MainStyles as styles,
  MARGIN_PX,
  SECTION_BAR_HEIGHT_PX,
} from "../../styles/MainStyles.jsx";
import { BACKGROUND_FIELD_GRADIENT } from "../../styles/BackgroundStyles.jsx";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";
import AppSettings from "../../AppSettings.jsx";
import { KEY_VIDEO_GENERATOR_FRAME_SETTINGS } from "../../settings/AssetsSettings.jsx";
import AppText from "../../AppText.jsx";
import { KEY_ASSETS_VIDEO } from "../../text/AssetsText.jsx";
import {
  CONTROL_ACTION_NEW_VIDEO,
  CONTROL_ACTION_OPEN_VIDEO,
  CONTROL_ACTION_SAVE_VIDEO,
} from "./video/VideoControlButtons.jsx";
import VideoOperationsBlock from "./video/VideoOperationsBlock.jsx";
import { get_visible_coverage_levels } from "./AssetsUtils.jsx";

const DEFAULT_VIDEO_RESOLUTION = 1024;
const DEFAULT_VIDEO_FPS = 30;
const VIDEO_OPERATIONS_HEIGHT_REDUCTION_PX = 50;
const VIDEO_OPERATIONS_WIDTH_REDUCTION_PX = 10;

export class AssetsVideoGenerator extends Component {
  state = {
    rendered_width: 0,
    rendered_height: 0,
    frame_settings: {},
    coverage_data: null,
    heat_map_buffer: null,
    video_script: null,
    selected_coverage_levels: [],
    frame_settings_subscription: null,
  };

  componentDidMount() {
    this.setState({
      frame_settings: AppSettings.get(KEY_VIDEO_GENERATOR_FRAME_SETTINGS),
      frame_settings_subscription: AppSettings.subscribe(
        KEY_VIDEO_GENERATOR_FRAME_SETTINGS,
        this.on_frame_settings_changed,
      ),
    });
  }

  componentWillUnmount() {
    const { frame_settings_subscription } = this.state;
    if (frame_settings_subscription) {
      AppSettings.unsubscribe(frame_settings_subscription);
    }
  }

  on_frame_settings_changed = (key, frame_settings) => {
    if (frame_settings) {
      this.setState({ frame_settings });
    }
  };
  on_coverage_data = (coverage_data, heat_map_buffer) => {
    this.setState({
      coverage_data,
      heat_map_buffer,
      selected_coverage_levels: get_visible_coverage_levels(
        coverage_data,
        heat_map_buffer,
      ),
    });
  };

  on_resize = (rendered_width, rendered_height) => {
    this.setState({ rendered_width, rendered_height });
  };

  on_coverage_levels_changed = (selected_coverage_levels) => {
    this.setState({ selected_coverage_levels });
  };

  first_step = () => {
    const { frame_settings } = this.state;
    return {
      focal_point: frame_settings.focal_point,
      scope: frame_settings.scope,
      frame_count: 1,
    };
  };

  open_video = (data) => {
    console.log("opening video...", data);
  };

  save_video = (data) => {
    console.log("saving video...", data);
  };

  new_video = () => {
    const { video_script } = this.state;
    if (video_script) {
      this.save_video(video_script);
    }
    const random_name = `vid_${Math.round(Math.random() * 100000000)}`;
    const first_step = this.first_step();
    const new_video_script = {
      asset_id: random_name,
      resolution: DEFAULT_VIDEO_RESOLUTION,
      fps: DEFAULT_VIDEO_FPS,
      steps: [first_step],
    };
    this.setState({ video_script: new_video_script });
  };

  on_control_action = (code, data) => {
    console.log("on_control_action", code);
    switch (code) {
      case CONTROL_ACTION_NEW_VIDEO:
        this.new_video();
        break;
      case CONTROL_ACTION_SAVE_VIDEO:
        this.save_video(data);
        break;
      case CONTROL_ACTION_OPEN_VIDEO:
        this.open_video(data);
        break;
      default:
        console.log("on_control_action unknown code", code);
        break;
    }
  };

  on_update_script = (video_script) => {
    this.setState({ video_script });
  };

  render() {
    const {
      coverage_data,
      heat_map_buffer,
      video_script,
      selected_coverage_levels,
      rendered_width,
      rendered_height,
    } = this.state;
    const navigation_splitter_pos = Number(
      AppSettings.get(VIDEO_GENERATOR_SPLITTER_KEYS.main_key),
    );
    const assets_splitter_pos = Number(
      AppSettings.get(VIDEO_GENERATOR_SPLITTER_KEYS.section_key),
    );
    const heat_map_size_px = Number(this.state.frame_settings?.width_px) || 0;
    // rendered_width already excludes the outer assets splitter. Convert the
    // inner navigator splitter from viewport coordinates to that content-area
    // coordinate system before sizing the operations panel.
    const operations_width = Math.max(
      0,
      rendered_width -
        (navigation_splitter_pos - assets_splitter_pos) -
        MARGIN_PX -
        VIDEO_OPERATIONS_WIDTH_REDUCTION_PX,
    );
    const operations_height = Math.max(
      0,
      rendered_height -
        SECTION_BAR_HEIGHT_PX -
        heat_map_size_px -
        2 * MARGIN_PX -
        VIDEO_OPERATIONS_HEIGHT_REDUCTION_PX,
    );
    const control_block = (
      <VideoControlBlock
        video_script={video_script}
        coverage_data={coverage_data}
        heat_map_buffer={heat_map_buffer}
        selected_levels={selected_coverage_levels}
        on_coverage_levels_changed={this.on_coverage_levels_changed}
        on_control_action={this.on_control_action}
      />
    );
    const operations_block = (
      <VideoOperationsBlock
        width_px={operations_width}
        height_px={operations_height}
        video_script={video_script}
        on_update_script={this.on_update_script}
      />
    );
    return [
      <styles.SectionTitle key={"assets-video-title"}>
        {AppText.get(KEY_ASSETS_VIDEO)}
      </styles.SectionTitle>,
      <CoolStyles.Block
        key={"assets-video-content"}
        style={{
          background: BACKGROUND_FIELD_GRADIENT,
          height: `calc(100vh - ${SECTION_BAR_HEIGHT_PX}px)`,
          overflow: "hidden",
        }}
      >
        <NavigatorCoverage
          splitter_keys={VIDEO_GENERATOR_SPLITTER_KEYS}
          control_block={[control_block]}
          results_block={[operations_block]}
          on_coverage_data={this.on_coverage_data}
          on_resize={this.on_resize}
          selected_levels={selected_coverage_levels}
        />
      </CoolStyles.Block>,
    ];
  }
}

export default AssetsVideoGenerator;
