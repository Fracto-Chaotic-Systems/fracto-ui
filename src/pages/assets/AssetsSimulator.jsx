import React, { Component } from "react";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppSettings from "../../AppSettings.jsx";
import {
  KEY_ASSETS_SIMULATOR_FRAME_SETTINGS,
  KEY_ASSETS_SPLITTER_POS_PX,
} from "../../settings/AssetsSettings.jsx";
import { ASSETS_SIMULATOR_SPLITTER_KEYS } from "../../navigator/NavigatorKeys.jsx";
import AppText from "../../AppText.jsx";
import { KEY_ASSETS_SIMULATOR } from "../../text/AssetsText.jsx";
import NavigatorSplitterLayout from "../../navigator/NavigatorSplitterLayout.jsx";
import { update_dimensions } from "../PageUtils.jsx";

const UPDATE_INTERVAL_MS = 1000;

/** Scaffold for the assets flight simulator navigator page. */
export class AssetsSimulator extends Component {
  state = {
    rendered_width: 0,
    rendered_height: 0,
    frame_settings: {},
    container_ref: React.createRef(),
    interval: null,
    subscription: null,
  };

  componentDidMount() {
    this.update_dimensions();
    this.setState({
      frame_settings: AppSettings.get(KEY_ASSETS_SIMULATOR_FRAME_SETTINGS),
      interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
      subscription: AppSettings.subscribe(
        KEY_ASSETS_SIMULATOR_FRAME_SETTINGS,
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
    const { rendered_width, rendered_height } = this.state;
    const new_values = update_dimensions(
      rendered_width,
      rendered_height,
      KEY_ASSETS_SPLITTER_POS_PX,
    );
    if (new_values) this.setState(new_values);
  };

  on_frame_settings_changed = (key, value) => {
    this.setState({ frame_settings: value });
  };

  render() {
    const {
      container_ref,
      rendered_width,
      rendered_height,
      frame_settings,
    } = this.state;
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
    return [
      <styles.SectionTitle key="assets-simulator-title">
        {AppText.get(KEY_ASSETS_SIMULATOR)}
      </styles.SectionTitle>,
      <styles.TightCenteredBlock
        ref={container_ref}
        key="assets-simulator-content"
      >
        <NavigatorSplitterLayout
          bounding_rect={bounding_rect}
          frame_settings={frame_settings}
          frame_settings_key={KEY_ASSETS_SIMULATOR_FRAME_SETTINGS}
          splitter_keys={ASSETS_SIMULATOR_SPLITTER_KEYS}
        />
      </styles.TightCenteredBlock>,
    ];
  }
}

export default AssetsSimulator;
