import React, { Component } from "react";

import { MainStyles as styles, MARGIN_PX } from "../../styles/MainStyles.jsx";
import AppSettings from "../../AppSettings.jsx";
import { update_dimensions } from "../PageUtils.jsx";
import {
  KEY_STUDY_POINTS_FRAME_SETTINGS,
  KEY_STUDY_POINTS_LEGEND_SPLITTER_POS,
  KEY_STUDY_POINTS_SPLITTER_POS,
  KEY_STUDY_POINTS_STEPS_SPLITTER_POS,
  KEY_STUDY_SPLITTER_POS_PX,
} from "../../settings/StudySettings.jsx";
import AppText from "../../AppText.jsx";

import NavigatorSplitterLayout from "../../navigator/NavigatorSplitterLayout.jsx";
import { KEY_STUDY_POINTS } from "../../text/StudyText.jsx";
import PointsMainPanel from "./points/PointsMainPanel.jsx";

const UPDATE_INTERVAL_MS = 1000;

export class StudyPoints extends Component {
  state = {
    rendered_width: 0,
    rendered_height: 0,
    interval: null,
    container_ref: React.createRef(),
    bounding_rect: {},
    frame_settings: {},
    subscription: null,
  };

  componentDidMount() {
    this.update_dimensions();
    this.setState({
      interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
      frame_settings: AppSettings.get(KEY_STUDY_POINTS_FRAME_SETTINGS),
      subscription: AppSettings.subscribe(
        KEY_STUDY_POINTS_FRAME_SETTINGS,
        this.on_frame_settings_changed,
      ),
    });
  }

  componentWillUnmount() {
    const { interval, subscription } = this.state;
    if (interval) {
      clearInterval(interval);
    }
    if (subscription) {
      AppSettings.unsubscribe(subscription);
    }
  }

  update_dimensions = () => {
    const { rendered_width, rendered_height } = this.state;
    const new_values = update_dimensions(
      rendered_width,
      rendered_height,
      KEY_STUDY_SPLITTER_POS_PX,
    );
    if (new_values) {
      this.setState(new_values);
    }
  };

  on_frame_settings_changed = (key, value) => {
    // console.log('on_frame_settings_changed', value)
    this.setState({ frame_settings: value });
  };

  render_content = () => {
    return <PointsMainPanel />;
  };

  render() {
    const { container_ref, rendered_height, rendered_width, frame_settings } =
      this.state;
    let top = 0;
    let left = 0;
    if (container_ref.current) {
      const container_bounds = container_ref.current.getBoundingClientRect();
      top = container_bounds.top;
      left = container_bounds.left;
    }
    const bounding_rect = {
      top,
      left,
      width: rendered_width,
      height: rendered_height,
    };
    const splitter_keys = {
      legend_key: KEY_STUDY_POINTS_LEGEND_SPLITTER_POS,
      main_key: KEY_STUDY_POINTS_SPLITTER_POS,
      steps_key: KEY_STUDY_POINTS_STEPS_SPLITTER_POS,
      section_key: KEY_STUDY_SPLITTER_POS_PX,
    };
    const splitter_pos = AppSettings.get(splitter_keys.main_key);
    const result_block_style = {
      left: `${splitter_pos + MARGIN_PX}px`,
      top: `${top}px`,
    };
    return [
      <styles.SectionTitle key={"study-overview-title"}>
        {AppText.get(KEY_STUDY_POINTS)}
      </styles.SectionTitle>,
      <styles.TightCenteredBlock ref={container_ref} key={"generator-content"}>
        <NavigatorSplitterLayout
          bounding_rect={bounding_rect}
          frame_settings={frame_settings}
          frame_settings_key={KEY_STUDY_POINTS_FRAME_SETTINGS}
          splitter_keys={splitter_keys}
        />
      </styles.TightCenteredBlock>,
      <styles.FixedInlineBlock style={result_block_style}>
        {this.render_content()}
      </styles.FixedInlineBlock>,
    ];
  }
}

export default StudyPoints;
