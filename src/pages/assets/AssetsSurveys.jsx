import React, { Component } from "react";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppSettings from "../../AppSettings.jsx";
import {
  KEY_ASSETS_SURVEYS_FRAME_SETTINGS,
  KEY_ASSETS_SURVEYS_SPLITTER_POS,
  KEY_ASSETS_SPLITTER_POS_PX,
} from "../../settings/AssetsSettings.jsx";
import { ASSETS_SURVEYS_SPLITTER_KEYS } from "../../navigator/NavigatorKeys.jsx";
import { SPLITTER_WIDTH_PX } from "../../constants.jsx";
import AppText from "../../AppText.jsx";
import {
  KEY_ASSETS_SURVEYS,
  KEY_ASSETS_SURVEYS_RENDER,
  KEY_ASSETS_SURVEYS_DETECT,
} from "../../text/AssetsText.jsx";
import NavigatorSplitterLayout from "../../navigator/NavigatorSplitterLayout.jsx";
import { update_dimensions } from "../PageUtils.jsx";
import SeedSurveyRender from "./surveys/SeedSurveyRender.jsx";
import SeedSurveyDetect from "./surveys/SeedSurveyDetect.jsx";
import CoolTabs from "../../utils/ui/CoolTabs.jsx";

const UPDATE_INTERVAL_MS = 1000;
const MIN_NAVIGATOR_WIDTH_PX = 400;
const MIN_CONTENT_WIDTH_PX = 255;
const TAB_CHROME_HEIGHT_PX = 24;

/** Seed-plane preview page with a persistent navigator and preview pane. */
export class AssetsSurveys extends Component {
  state = {
    rendered_width: 0,
    rendered_height: 0,
    content_splitter_pos: 0,
    selected_tab_index: 0,
    frame_settings: {},
    container_ref: React.createRef(),
    interval: null,
    subscription: null,
  };

  componentDidMount() {
    this.update_dimensions();
    this.setState({
      frame_settings: AppSettings.get(KEY_ASSETS_SURVEYS_FRAME_SETTINGS),
      content_splitter_pos: AppSettings.get(KEY_ASSETS_SURVEYS_SPLITTER_POS),
      interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
      subscription: AppSettings.subscribe(
        KEY_ASSETS_SURVEYS_FRAME_SETTINGS,
        this.on_frame_settings_changed,
      ),
      splitter_subscription: AppSettings.subscribe(
        KEY_ASSETS_SURVEYS_SPLITTER_POS,
        this.on_navigator_splitter_changed,
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

  on_frame_settings_changed = (_key, value) =>
    this.setState({ frame_settings: value });

  on_navigator_splitter_changed = (_key, position) =>
    this.setState({ content_splitter_pos: position });

  on_tab_select = (selected_tab_index) =>
    this.setState({ selected_tab_index });

  render() {
    const {
      container_ref,
      rendered_width,
      rendered_height,
      selected_tab_index,
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
    const max_navigator_width = Math.max(
      0,
      rendered_width - MIN_CONTENT_WIDTH_PX,
    );
    const min_navigator_width = Math.min(
      MIN_NAVIGATOR_WIDTH_PX,
      max_navigator_width,
    );
    const right_panel_left = content_splitter_pos + SPLITTER_WIDTH_PX / 2;
    const right_panel_width = Math.max(
      0,
      left + rendered_width - right_panel_left,
    );
    const tab_content_height = Math.max(
      0,
      rendered_height - TAB_CHROME_HEIGHT_PX,
    );
    let selected_content;
    switch (selected_tab_index) {
      case 0:
        selected_content = (
          <SeedSurveyRender
            focal_point={frame_settings?.focal_point}
            width_px={right_panel_width}
            height_px={tab_content_height}
          />
        );
        break;
      case 1:
        selected_content = (
          <SeedSurveyDetect
            focal_point={frame_settings?.focal_point}
            width_px={right_panel_width}
            height_px={tab_content_height}
          />
        );
        break;
      default:
        console.error(`Unimplemented surveys tab: ${selected_tab_index}`);
        selected_content = <div />;
    }
    return [
      <styles.SectionTitle key="assets-surveys-title">
        {AppText.get(KEY_ASSETS_SURVEYS)}
      </styles.SectionTitle>,
      <div
        ref={container_ref}
        key="assets-surveys-layout"
        style={{
          width: `${rendered_width}px`,
          height: `${rendered_height}px`,
        }}
      >
        <NavigatorSplitterLayout
          bounding_rect={bounding_rect}
          frame_settings={frame_settings}
          frame_settings_key={KEY_ASSETS_SURVEYS_FRAME_SETTINGS}
          splitter_keys={ASSETS_SURVEYS_SPLITTER_KEYS}
          main_splitter_min_position={left + min_navigator_width}
          main_splitter_max_position={left + max_navigator_width}
        />
        <styles.FixedBlock
          style={{
            top,
            left: right_panel_left,
            width: right_panel_width,
            height: rendered_height,
            overflow: "hidden",
            backgroundColor: "#fcfcfc",
          }}
        >
          <CoolTabs
            labels={[
              <span key="render-tab-label" style={{ textTransform: "none" }}>
                {AppText.get(KEY_ASSETS_SURVEYS_RENDER)}
              </span>,
              <span key="detect-tab-label" style={{ textTransform: "none" }}>
                {AppText.get(KEY_ASSETS_SURVEYS_DETECT)}
              </span>,
            ]}
            tab_index={selected_tab_index}
            on_tab_select={this.on_tab_select}
            selected_content={selected_content}
            style={{ width: "100%" }}
          />
        </styles.FixedBlock>
      </div>,
    ];
  }
}

export default AssetsSurveys;
