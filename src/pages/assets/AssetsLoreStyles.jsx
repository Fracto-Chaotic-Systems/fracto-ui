import React, { Component } from "react";
import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import AppSettings from "../../AppSettings.jsx";
import { KEY_ASSETS_LORE_STYLES } from "../../text/AssetsText.jsx";
import { KEY_STUDY_SPLITTER_POS_PX } from "../../settings/StudySettings.jsx";
import { update_dimensions } from "../PageUtils.jsx";
import CoolSplitter, {
  SPLITTER_TYPE_HORIZONTAL,
  SPLITTER_TYPE_VERTICAL,
} from "../../utils/ui/CoolSplitter.jsx";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";
import { SPLITTER_WIDTH_PX } from "../../constants.jsx";
import {
  KEY_ASSETS_LORE_STYLES_LOWER_SPLITTER_POS_PX,
  KEY_ASSETS_LORE_STYLES_OUTERMOST_SPLITTER_POS_PX,
  KEY_ASSETS_LORE_STYLES_UPPER_SPLITTER_POS_PX,
  KEY_ASSETS_LORE_STYLES_UPPER_RIGHT_SPLITTER_POS_PX,
} from "../../settings/AssetsSettings.jsx";
import LoreStylesEntry from "./lore/styles/LoreStylesEntry.jsx";
import LoreStylesView from "./lore/styles/LoreStylesView.jsx";
import LoreStylesEdit from "./lore/styles/LoreStylesEdit.jsx";

const UPDATE_INTERVAL_MS = 1000;
const PHI = (1 + Math.sqrt(5)) / 2;
const MIN_SPLITTER_REGION_PX = 100;

/** Initial scaffold for shared styling controls used by the lore section. */
export class AssetsLoreStyles extends Component {
  state = {
    rendered_width: 0,
    rendered_height: 0,
    interval: null,
    splitter_position: 0,
    lower_splitter_position: 0,
    upper_splitter_position: 0,
    upper_right_splitter_position: 0,
    container_ref: React.createRef(),
    container_bounds: {},
  };

  componentDidMount() {
    this.update_dimensions();
    const saved_position = AppSettings.get(
      KEY_ASSETS_LORE_STYLES_OUTERMOST_SPLITTER_POS_PX,
    );
    const saved_lower_position = AppSettings.get(
      KEY_ASSETS_LORE_STYLES_LOWER_SPLITTER_POS_PX,
    );
    const saved_upper_position = AppSettings.get(
      KEY_ASSETS_LORE_STYLES_UPPER_SPLITTER_POS_PX,
    );
    const saved_upper_right_position = AppSettings.get(
      KEY_ASSETS_LORE_STYLES_UPPER_RIGHT_SPLITTER_POS_PX,
    );
    this.setState({
      splitter_position: saved_position,
      lower_splitter_position: saved_lower_position,
      upper_splitter_position: saved_upper_position,
      upper_right_splitter_position: saved_upper_right_position,
    });
    this.setState({
      interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
    });
  }

  componentWillUnmount() {
    if (this.state.interval) clearInterval(this.state.interval);
  }

  update_dimensions = () => {
    const { rendered_width, rendered_height } = this.state;
    const new_values = update_dimensions(
      rendered_width,
      rendered_height,
      KEY_STUDY_SPLITTER_POS_PX,
    );
    if (new_values) {
      const splitter_position =
        this.state.splitter_position || new_values.rendered_height / PHI;
      this.setState({
        ...new_values,
        splitter_position,
        container_bounds: {
          left: 0,
          top: 0,
          width: new_values.rendered_width,
          height: new_values.rendered_height,
        },
      });
    }
  };

  on_splitter_change = (position) => {
    this.setState({ splitter_position: position });
    AppSettings.on_settings_changed({
      [KEY_ASSETS_LORE_STYLES_OUTERMOST_SPLITTER_POS_PX]: position,
    });
  };

  on_lower_splitter_change = (position) => {
    this.setState({ lower_splitter_position: position });
    AppSettings.on_settings_changed({
      [KEY_ASSETS_LORE_STYLES_LOWER_SPLITTER_POS_PX]: position,
    });
  };

  on_upper_splitter_change = (position) => {
    this.setState({ upper_splitter_position: position });
    AppSettings.on_settings_changed({
      [KEY_ASSETS_LORE_STYLES_UPPER_SPLITTER_POS_PX]: position,
    });
  };

  on_upper_right_splitter_change = (position) => {
    this.setState({ upper_right_splitter_position: position });
    AppSettings.on_settings_changed({
      [KEY_ASSETS_LORE_STYLES_UPPER_RIGHT_SPLITTER_POS_PX]: position,
    });
  };

  render() {
    const {
      rendered_width,
      rendered_height,
      splitter_position,
      lower_splitter_position,
      upper_splitter_position,
      upper_right_splitter_position,
      container_ref,
      container_bounds,
    } = this.state;
    const outer_splitter_min = rendered_height * 0.6;
    const outer_splitter_max = rendered_height * 0.9;
    const bounded_outer_position = Math.min(
      outer_splitter_max,
      Math.max(outer_splitter_min, splitter_position),
    );
    const top_height = bounded_outer_position;
    const bottom_height = Math.max(0, rendered_height - top_height);
    const upper_splitter_min = rendered_width * 0.7;
    const upper_splitter_max = rendered_width * 0.9;
    const upper_position = Math.min(
      upper_splitter_max,
      Math.max(
        upper_splitter_min,
        upper_splitter_position || rendered_width * 0.8,
      ),
    );
    const upper_right_height = top_height;
    const upper_right_splitter_min = upper_right_height * 0.2;
    const upper_right_splitter_max = upper_right_height * 0.8;
    const upper_right_position = Math.min(
      upper_right_splitter_max,
      Math.max(
        upper_right_splitter_min,
        upper_right_splitter_position || upper_right_height / 2,
      ),
    );
    const lower_splitter_min = Math.min(
      rendered_width,
      Math.max(MIN_SPLITTER_REGION_PX, bottom_height / 2),
    );
    const lower_splitter_max = Math.max(
      lower_splitter_min,
      Math.min(
        rendered_width - MIN_SPLITTER_REGION_PX,
        rendered_width - bottom_height / 2,
      ),
    );
    const lower_position = Math.min(
      lower_splitter_max,
      Math.max(
        lower_splitter_min,
        lower_splitter_position || rendered_width / 2,
      ),
    );
    // The vertical splitter is positioned relative to the lower region itself.
    const lower_bounds = {
      left: 0,
      top: 0,
      width: rendered_width,
      height: bottom_height,
    };
    return [
      <styles.SectionTitle key={"assets-lore-styles-title"}>
        {AppText.get(KEY_ASSETS_LORE_STYLES)}
      </styles.SectionTitle>,
      <styles.BodyWrapper
        key={"assets-lore-styles-body"}
        ref={container_ref}
        style={{
          position: "relative",
          width: `${rendered_width}px`,
          height: `${rendered_height}px`,
        }}
      >
        <CoolStyles.Block
          style={{
            height: `${top_height}px`,
            overflow: "hidden",
            position: "relative",
            display: "flex",
          }}
        >
          <CoolStyles.Block
            style={{ width: `${upper_position}px`, height: "100%", flexShrink: 0 }}
          >
            <LoreStylesEdit
              width_px={upper_position}
              height_px={top_height}
            />
          </CoolStyles.Block>
          <CoolStyles.Block
            style={{
              width: `${Math.max(0, rendered_width - upper_position)}px`,
              height: "100%",
              flexShrink: 0,
              position: "relative",
            }}
          >
            <CoolStyles.Block
              style={{ height: `${upper_right_position}px`, overflow: "hidden" }}
            />
            <CoolStyles.Block
              style={{
                height: `${Math.max(0, upper_right_height - upper_right_position)}px`,
                overflow: "hidden",
              }}
            />
            <CoolSplitter
              type={SPLITTER_TYPE_HORIZONTAL}
              name={KEY_ASSETS_LORE_STYLES_UPPER_RIGHT_SPLITTER_POS_PX}
              bar_width_px={SPLITTER_WIDTH_PX}
              container_bounds={{
                left: 0,
                top: 0,
                width: Math.max(0, rendered_width - upper_position),
                height: upper_right_height,
              }}
              position={upper_right_position}
              min_position={upper_right_splitter_min}
              max_position={upper_right_splitter_max}
              on_change={this.on_upper_right_splitter_change}
            />
          </CoolStyles.Block>
          <CoolSplitter
            type={SPLITTER_TYPE_VERTICAL}
            name={KEY_ASSETS_LORE_STYLES_UPPER_SPLITTER_POS_PX}
            bar_width_px={SPLITTER_WIDTH_PX}
            container_bounds={{
              left: 0,
              top: 0,
              width: rendered_width,
              height: top_height,
            }}
            position={upper_position}
            min_position={upper_splitter_min}
            max_position={upper_splitter_max}
            on_change={this.on_upper_splitter_change}
          />
        </CoolStyles.Block>
        <CoolStyles.Block
          style={{
            height: `${bottom_height}px`,
            overflow: "hidden",
            position: "relative",
            display: "flex",
          }}
        >
          <CoolStyles.Block
            style={{
              width: `${lower_position}px`,
              height: "100%",
              flexShrink: 0,
              padding: "5px",
              boxSizing: "border-box",
            }}
          >
            <LoreStylesEntry
              width_px={Math.max(0, lower_position)}
              height_px={bottom_height}
            />
          </CoolStyles.Block>
          <CoolStyles.Block
            style={{
              width: `${Math.max(0, rendered_width - lower_position)}px`,
              height: "100%",
              flexShrink: 0,
              marginLeft: '5px',
              padding: "5px",
              boxSizing: "border-box",
            }}
          >
            <LoreStylesView
              width_px={Math.max(0, rendered_width - lower_position - 10)}
              height_px={bottom_height}
            />
          </CoolStyles.Block>
          <CoolSplitter
            type={SPLITTER_TYPE_VERTICAL}
            name={KEY_ASSETS_LORE_STYLES_LOWER_SPLITTER_POS_PX}
            bar_width_px={SPLITTER_WIDTH_PX}
            container_bounds={lower_bounds}
            position={lower_position}
            min_position={lower_splitter_min}
            max_position={lower_splitter_max}
            on_change={this.on_lower_splitter_change}
          />
        </CoolStyles.Block>
        <CoolSplitter
          type={SPLITTER_TYPE_HORIZONTAL}
          name={KEY_ASSETS_LORE_STYLES_OUTERMOST_SPLITTER_POS_PX}
          bar_width_px={SPLITTER_WIDTH_PX}
          container_bounds={container_bounds}
          position={bounded_outer_position}
          min_position={outer_splitter_min}
          max_position={outer_splitter_max}
          on_change={this.on_splitter_change}
        />
      </styles.BodyWrapper>,
    ];
  }
}

export default AssetsLoreStyles;
