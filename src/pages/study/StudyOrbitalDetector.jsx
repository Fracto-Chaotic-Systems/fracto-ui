import React, { Component } from "react";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppSettings from "../../AppSettings.jsx";
import { KEY_VIEWPORT_DIMENSIONS } from "../../settings/RootSettings.jsx";
import {
  KEY_STUDY_DETECTION_FRAME_SETTINGS,
  KEY_STUDY_DETECTION_LEGEND_SPLITTER_POS,
  KEY_STUDY_DETECTION_SPLITTER_POS,
  KEY_STUDY_DETECTION_STEPS_SPLITTER_POS,
  KEY_STUDY_SPLITTER_POS_PX,
} from "../../settings/StudySettings.jsx";
import AppText from "../../AppText.jsx";
import { KEY_STUDY_DETECTION } from "../../text/StudyText.jsx";
import NavigatorSplitterLayout from "../../navigator/NavigatorSplitterLayout.jsx";
import OrbitalSpectrumChart from "./OrbitalSpectrumChart.jsx";

const UPDATE_INTERVAL_MS = 1000;

/**
 * Scaffolding for the core orbital detector study page.
 *
 * The detector content will be added separately. This page owns a distinct
 * frame-settings and splitter namespace so navigating here cannot alter the
 * persisted layout or focal point used by orbital circuitry.
 */
export class StudyOrbitalDetector extends Component {
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
      frame_settings: AppSettings.get(KEY_STUDY_DETECTION_FRAME_SETTINGS),
      subscription: AppSettings.subscribe(
        KEY_STUDY_DETECTION_FRAME_SETTINGS,
        this.on_frame_settings_changed,
      ),
    });
  }

  componentWillUnmount() {
    const { interval, subscription } = this.state;
    if (interval) clearInterval(interval);
    if (subscription) AppSettings.unsubscribe(subscription);
  }

  update_dimensions = () => {
    const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS);
    const splitter_width = AppSettings.get(KEY_STUDY_SPLITTER_POS_PX);
    this.setState({
      rendered_width: viewport_dimensions.width - splitter_width,
      rendered_height: viewport_dimensions.height,
    });
  };

  on_frame_settings_changed = (key, value) => {
    this.setState({ frame_settings: value });
  };

  render() {
    const { container_ref, rendered_height, rendered_width, frame_settings } =
      this.state;
    let top = 0;
    let left = 0;
    if (container_ref.current) {
      const bounds = container_ref.current.getBoundingClientRect();
      top = bounds.top;
      left = bounds.left;
    }
    const bounding_rect = {
      top,
      left,
      width: rendered_width,
      height: rendered_height,
    };
    const detector_splitter_pos = AppSettings.get(
      KEY_STUDY_DETECTION_SPLITTER_POS,
    );
    const detector_content_width = Math.max(
      0,
      rendered_width - detector_splitter_pos,
    );
    const detector_content_height = Math.max(0, Math.floor(rendered_height / 2));
    const detector_content_style = {
      position: "fixed",
      left: `${detector_splitter_pos}px`,
      top: `${top}px`,
      width: `${detector_content_width}px`,
      height: `${detector_content_height}px`,
      boxSizing: "border-box",
      overflow: "hidden",
      padding: "0.5rem",
    };
    return [
      <styles.SectionTitle key="study-orbital-detector-title">
        {AppText.get(KEY_STUDY_DETECTION)}
      </styles.SectionTitle>,
      <styles.TightCenteredBlock
        ref={container_ref}
        key="study-orbital-detector-navigation"
      >
        <NavigatorSplitterLayout
          bounding_rect={bounding_rect}
          frame_settings={frame_settings}
          frame_settings_key={KEY_STUDY_DETECTION_FRAME_SETTINGS}
          splitter_keys={{
            legend_key: KEY_STUDY_DETECTION_LEGEND_SPLITTER_POS,
            main_key: KEY_STUDY_DETECTION_SPLITTER_POS,
            steps_key: KEY_STUDY_DETECTION_STEPS_SPLITTER_POS,
            section_key: KEY_STUDY_SPLITTER_POS_PX,
          }}
        />
      </styles.TightCenteredBlock>,
      <styles.FixedInlineBlock
        key="study-orbital-detector-content"
        style={detector_content_style}
      >
        <OrbitalSpectrumChart
          focal_point={frame_settings.focal_point}
          width_px={Math.max(0, detector_content_width - 16)}
          height_px={Math.max(0, detector_content_height - 16)}
        />
      </styles.FixedInlineBlock>,
    ];
  }
}

export default StudyOrbitalDetector;
