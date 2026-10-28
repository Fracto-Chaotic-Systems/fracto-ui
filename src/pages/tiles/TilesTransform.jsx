import React, { Component, createRef } from "react";
import { MainStyles as styles, MARGIN_PX } from "../../styles/MainStyles.jsx";
import AppSettings from "../../AppSettings.jsx";
import AppText from "../../AppText.jsx";
import { KEY_TILES_MESH_TRANSFORMS } from "../../text/TilesText.jsx";
import {
  KEY_TILES_TRANSFORM_FRAME_SETTINGS,
  KEY_TILES_SPLITTER_POS_PX,
  KEY_TILES_TRANSFORM_SPLITTER_POS,
} from "../../settings/TilesSettings.jsx";
import { TILE_TRANSFORM_SPLITTER_KEYS } from "../../navigator/NavigatorKeys.jsx";
import NavigatorSplitterLayout from "../../navigator/NavigatorSplitterLayout.jsx";
import PageAutomation, {
  PAGE_MODE_OPERATOR,
} from "../utils/PageAutomation.jsx";
import { update_dimensions } from "../PageUtils.jsx";
import MeshHeatMap from "./MeshHeatMap.jsx";

/** Persistent navigator and mode-independent mesh availability panel. */
export default class TilesTransform extends Component {
  container_ref = createRef();
  interval = null;
  subscription = null;
  state = {
    rendered_width: 0,
    rendered_height: 0,
    frame_settings: AppSettings.get(KEY_TILES_TRANSFORM_FRAME_SETTINGS),
    automation_mode: PAGE_MODE_OPERATOR,
    navigator_splitter: AppSettings.get(KEY_TILES_TRANSFORM_SPLITTER_POS),
  };

  componentDidMount() {
    this.update_dimensions();
    this.subscription = AppSettings.subscribe(
      KEY_TILES_TRANSFORM_FRAME_SETTINGS,
      (_key, frame_settings) => this.setState({ frame_settings }),
    );
    this.interval = setInterval(this.update_dimensions, 1000);
    this.splitter_subscription = AppSettings.subscribe(
      KEY_TILES_TRANSFORM_SPLITTER_POS,
      (_key, navigator_splitter) => this.setState({ navigator_splitter }),
    );
  }

  componentWillUnmount() {
    clearInterval(this.interval);
    if (this.subscription) AppSettings.unsubscribe(this.subscription);
    if (this.splitter_subscription)
      AppSettings.unsubscribe(this.splitter_subscription);
  }

  update_dimensions = () => {
    const { rendered_width, rendered_height } = this.state;
    const dimensions = update_dimensions(
      rendered_width,
      rendered_height,
      KEY_TILES_SPLITTER_POS_PX,
    );
    if (dimensions) this.setState(dimensions);
  };

  on_automation_mode_change = (automation_mode) =>
    this.setState({ automation_mode });

  render() {
    const { rendered_width, rendered_height, frame_settings } = this.state;
    const bounds = this.container_ref.current?.getBoundingClientRect();
    const top = bounds?.top || 0;
    const bounding_rect = {
      top,
      left: bounds?.left || 0,
      width: rendered_width,
      height: Math.max(0, rendered_height - top),
    };
    const right_left = this.state.navigator_splitter + MARGIN_PX;
    const right_width = Math.max(
      0,
      bounding_rect.left + rendered_width - right_left,
    );
    return (
      <>
        <styles.SectionTitle style={{ position: "relative" }}>
          {AppText.get(KEY_TILES_MESH_TRANSFORMS)}
          <PageAutomation
            automation_type="tiles_transform"
            on_mode_change={this.on_automation_mode_change}
          />
        </styles.SectionTitle>
        <styles.TightCenteredBlock ref={this.container_ref}>
          <NavigatorSplitterLayout
            bounding_rect={bounding_rect}
            frame_settings={frame_settings}
            frame_settings_key={TILE_TRANSFORM_SPLITTER_KEYS.frame_settings_key}
            splitter_keys={TILE_TRANSFORM_SPLITTER_KEYS}
          />
          <styles.FixedBlock
            style={{
              top,
              left: right_left,
              width: right_width,
              height: bounding_rect.height,
              overflow: "auto",
            }}
          >
            <MeshHeatMap
              frame_settings={frame_settings}
              width_px={right_width}
            />
          </styles.FixedBlock>
        </styles.TightCenteredBlock>
      </>
    );
  }
}
