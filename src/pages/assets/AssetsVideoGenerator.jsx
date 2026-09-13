import React, { Component } from "react";

import NavigatorCoverage from "../../navigator/NavigatorCoverage.jsx";
import { VIDEO_GENERATOR_SPLITTER_KEYS } from "../../navigator/NavigatorKeys.jsx";
import VideoControlBlock from "./video/VideoControlBlock.jsx";

import {
  MainStyles as styles,
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

export class AssetsVideoGenerator extends Component {
  state = {
    frame_settings: {},
    coverage_data: null,
    heat_map_buffer: null,
    video_script: null,
    selected_coverage_levels: [],
  };

  componentDidMount() {
    this.setState({
      frame_settings: AppSettings.get(KEY_VIDEO_GENERATOR_FRAME_SETTINGS),
    });
  }
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
    } = this.state;
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
          selected_levels={selected_coverage_levels}
        />
      </CoolStyles.Block>,
    ];
  }
}

export default AssetsVideoGenerator;
