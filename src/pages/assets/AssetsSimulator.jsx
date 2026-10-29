import React, { Component } from "react";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppSettings from "../../AppSettings.jsx";
import {
  KEY_ASSETS_SIMULATOR_FRAME_SETTINGS,
  KEY_ASSETS_SIMULATOR_SPLITTER_POS,
  KEY_ASSETS_SPLITTER_POS_PX,
} from "../../settings/AssetsSettings.jsx";
import { ASSETS_SIMULATOR_SPLITTER_KEYS } from "../../navigator/NavigatorKeys.jsx";
import AppText from "../../AppText.jsx";
import { KEY_ASSETS_SIMULATOR } from "../../text/AssetsText.jsx";
import NavigatorSplitterLayout from "../../navigator/NavigatorSplitterLayout.jsx";
import { update_dimensions } from "../PageUtils.jsx";
import { SPLITTER_WIDTH_PX } from "../../constants.jsx";
import { TERRAIN_TEXT } from "../../text/AssetsText.jsx";

const SimulatorTerrain = React.lazy(() => import("./SimulatorTerrain.jsx"));

const UPDATE_INTERVAL_MS = 1000;

/** Interactive 2D navigator with a separate terrain preview to its right. */
export class AssetsSimulator extends Component {
  state = {
    rendered_width: 0,
    rendered_height: 0,
    frame_settings: {},
    container_ref: React.createRef(),
    interval: null,
    subscription: null,
    content_splitter_pos: 500,
  };

  componentDidMount() {
    this.update_dimensions();
    this.setState({
      frame_settings: AppSettings.get(KEY_ASSETS_SIMULATOR_FRAME_SETTINGS),
      content_splitter_pos: AppSettings.get(KEY_ASSETS_SIMULATOR_SPLITTER_POS),
      splitter_subscription: AppSettings.subscribe(
        KEY_ASSETS_SIMULATOR_SPLITTER_POS,
        this.on_splitter_changed,
      ),
      interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
      subscription: AppSettings.subscribe(
        KEY_ASSETS_SIMULATOR_FRAME_SETTINGS,
        this.on_frame_settings_changed,
      ),
    });
  }

  componentWillUnmount() {
    const { interval, subscription, splitter_subscription } = this.state;
    if (interval) clearInterval(interval);
    if (subscription) AppSettings.unsubscribe(subscription);
    if (splitter_subscription) AppSettings.unsubscribe(splitter_subscription);
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

  on_splitter_changed = (_key, content_splitter_pos) =>
    this.setState({ content_splitter_pos });

  render() {
    const {
      container_ref,
      rendered_width,
      rendered_height,
      frame_settings,
      content_splitter_pos,
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
    const right_left = Math.max(
      left,
      content_splitter_pos + SPLITTER_WIDTH_PX / 2,
    );
    const right_width = Math.max(0, left + rendered_width - right_left);
    const available_height = Math.max(0, rendered_height - top);
    return [
      <styles.SectionTitle key="assets-simulator-title">
        {AppText.get(KEY_ASSETS_SIMULATOR)}
      </styles.SectionTitle>,
      <styles.TightCenteredBlock
        ref={container_ref}
        key="assets-simulator-content"
      >
        {frame_settings?.focal_point && (
          <NavigatorSplitterLayout
            bounding_rect={bounding_rect}
            frame_settings={frame_settings}
            frame_settings_key={KEY_ASSETS_SIMULATOR_FRAME_SETTINGS}
            splitter_keys={ASSETS_SIMULATOR_SPLITTER_KEYS}
          />
        )}
        <styles.FixedBlock
          style={{
            top,
            left: right_left,
            width: right_width,
            height: available_height,
            overflow: "hidden",
          }}
        >
          <React.Suspense
            fallback={<div>{AppText.get(TERRAIN_TEXT.loading)}</div>}
          >
            <SimulatorTerrain
              width_px={right_width}
              height_px={available_height}
              focal_point={frame_settings?.focal_point}
              scope={frame_settings?.scope}
              aspect_ratio={frame_settings?.aspect_ratio ?? 1}
            />
          </React.Suspense>
        </styles.FixedBlock>
      </styles.TightCenteredBlock>,
    ];
  }
}

export default AssetsSimulator;
