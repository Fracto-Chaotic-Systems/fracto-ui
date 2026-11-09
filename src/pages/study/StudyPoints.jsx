import React, { Component } from "react";
import styled from "styled-components";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import AppSettings from "../../AppSettings.jsx";
import { SPLITTER_WIDTH_PX } from "../../constants.jsx";
import {
  KEY_STUDY_POINTS_VERTICAL_SPLITTER_POS,
  KEY_STUDY_POINTS_HORIZONTAL_SPLITTER_POS,
} from "../../settings/StudySettings.jsx";
import CoolSplitter, {
  SPLITTER_TYPE_VERTICAL,
  SPLITTER_TYPE_HORIZONTAL,
} from "../../utils/ui/CoolSplitter.jsx";

import { KEY_STUDY_POINTS } from "../../text/StudyText.jsx";
import PointsMinibrotTabs from "./points/PointsMinibrotTabs.jsx";
import PointsStoredOrbitals from "./points/PointsStoredOrbitals.jsx";
import PointsSelectedPreview from "./points/PointsSelectedPreview.jsx";
import PointsOrbitalPanel from "./points/PointsOrbitalPanel.jsx";
import PointsOrbitalPointList from "./points/PointsOrbitalPointList.jsx";

const Layout = styled.div`
  position: relative;
  width: 100%;
  overflow: hidden;
`;

const Pane = styled.div`
  position: absolute;
  overflow: auto;
`;

const LeftSections = styled.div`
  position: absolute;
  display: grid;
  grid-template-rows: repeat(3, minmax(0, 1fr));
  overflow: hidden;

  > div {
    min-height: 0;
    overflow: auto;
    box-sizing: border-box;
  }

  > div + div {
    border-top: 1px solid #cccccc;
  }
`;

const SPLITTER_KEYS = [
  KEY_STUDY_POINTS_VERTICAL_SPLITTER_POS,
  KEY_STUDY_POINTS_HORIZONTAL_SPLITTER_POS,
];
const VERTICAL_MIN_PX = 100;
const VERTICAL_MAX_PX = 300;

export class StudyPoints extends Component {
  container_ref = React.createRef();
  subscriptions = [];

  state = {
    width: 0,
    height: 0,
    vertical: 500,
    horizontal: 500,
    selected_minibrot: null,
    selected_orbital: null,
    active_point_index: -1,
    animation_playing: false,
  };

  on_select_minibrot = (selected_minibrot) =>
    this.setState({ selected_minibrot, selected_orbital: null, active_point_index: -1, animation_playing: false });

  on_select_orbital = (selected_orbital) => this.setState({ selected_orbital, active_point_index: -1 });

  on_active_point_changed = (orbital_id, active_point_index, animation_playing = false) => {
    if (orbital_id === this.state.selected_orbital?.orbital_id &&
        (active_point_index !== this.state.active_point_index ||
         animation_playing !== this.state.animation_playing)) {
      this.setState({ active_point_index, animation_playing });
    }
  };

  componentDidMount() {
    this.read_positions();
    this.subscriptions = SPLITTER_KEYS.map((key) =>
      AppSettings.subscribe(key, this.read_positions),
    );
    this.resize_observer = new ResizeObserver(this.update_dimensions);
    this.resize_observer.observe(this.container_ref.current);
    window.addEventListener("resize", this.update_dimensions);
    this.update_dimensions();
  }

  componentWillUnmount() {
    this.resize_observer.disconnect();
    window.removeEventListener("resize", this.update_dimensions);
    this.subscriptions.forEach((subscription) =>
      AppSettings.unsubscribe(subscription),
    );
  }

  read_positions = () => {
    const position = (key) => {
      const value = AppSettings.get(key);
      return Number.isFinite(value) ? value : 500;
    };
    this.setState({
      vertical: position(KEY_STUDY_POINTS_VERTICAL_SPLITTER_POS),
      horizontal: position(KEY_STUDY_POINTS_HORIZONTAL_SPLITTER_POS),
    });
  };

  update_dimensions = () => {
    const bounds = this.container_ref.current.getBoundingClientRect();
    const width = Math.max(0, bounds.width);
    const height = Math.max(0, window.innerHeight - bounds.top);
    if (width !== this.state.width || height !== this.state.height) {
      this.setState({ width, height });
    }
  };

  move_vertical = (position) => {
    AppSettings.on_settings_changed({
      [KEY_STUDY_POINTS_VERTICAL_SPLITTER_POS]: Math.min(
        VERTICAL_MAX_PX,
        Math.max(VERTICAL_MIN_PX, position),
      ),
    });
  };

  move_horizontal = (position) => {
    AppSettings.on_settings_changed({
      [KEY_STUDY_POINTS_HORIZONTAL_SPLITTER_POS]: position,
    });
  };

  render() {
    const { width, height, vertical, horizontal } = this.state;
    const half_bar = SPLITTER_WIDTH_PX / 2;
    // Clamp only the displayed geometry; resizing must not overwrite saved offsets.
    const vertical_max = Math.max(0, Math.min(VERTICAL_MAX_PX, width - half_bar));
    const vertical_min = Math.min(VERTICAL_MIN_PX, vertical_max);
    const x = Math.max(vertical_min, Math.min(vertical, vertical_max));
    const y = Math.max(0, Math.min(horizontal, height - half_bar));
    const right_left = Math.min(width, x + half_bar);
    const right_width = width - right_left;
    const bottom_top = Math.min(height, y + half_bar);
    return (
      <>
        <styles.SectionTitle key={"study-overview-title"}>
          {AppText.get(KEY_STUDY_POINTS)}
        </styles.SectionTitle>
        <Layout ref={this.container_ref} style={{ height }}>
          <LeftSections
            style={{
              left: 0,
              top: 0,
              width: Math.max(0, x - half_bar),
              height,
            }}
          >
            <div>
              <PointsSelectedPreview
                selected_minibrot={this.state.selected_minibrot}
                width_px={Math.max(0, x - half_bar)}
                height_px={height / 3}
              />
            </div>
            <div>
              <PointsMinibrotTabs
                on_select_minibrot={this.on_select_minibrot}
              />
            </div>
            <div>
              <PointsStoredOrbitals
                selected_minibrot={this.state.selected_minibrot}
                on_select_orbital={this.on_select_orbital}
              />
            </div>
          </LeftSections>
          <Pane
            style={{
              left: right_left,
              top: 0,
              width: right_width,
              height: Math.max(0, y - half_bar),
            }}
          >
            <PointsOrbitalPanel
              selected_minibrot={this.state.selected_minibrot}
              selected_orbital={this.state.selected_orbital}
              width_px={right_width}
              on_active_point_changed={this.on_active_point_changed}
              active_point_index={this.state.active_point_index}
              animation_playing={this.state.animation_playing}
            />
          </Pane>
          <Pane
            style={{
              left: right_left,
              top: bottom_top,
              width: right_width,
              height: height - bottom_top,
            }}
          >
            <PointsOrbitalPointList
              selected_orbital={this.state.selected_orbital}
              active_point_index={this.state.active_point_index}
            />
          </Pane>
          {width > 0 && height > 0 && (
            <>
              <CoolSplitter
                type={SPLITTER_TYPE_VERTICAL}
                name={KEY_STUDY_POINTS_VERTICAL_SPLITTER_POS}
                bar_width_px={SPLITTER_WIDTH_PX}
                container_bounds={{ left: 0, top: 0, width, height }}
                position={x}
                min_position={vertical_min}
                max_position={vertical_max}
                on_change={this.move_vertical}
              />
              <CoolSplitter
                type={SPLITTER_TYPE_HORIZONTAL}
                name={KEY_STUDY_POINTS_HORIZONTAL_SPLITTER_POS}
                bar_width_px={SPLITTER_WIDTH_PX}
                container_bounds={{
                  left: right_left,
                  top: 0,
                  width: right_width,
                  height,
                }}
                position={y}
                min_position={0}
                max_position={Math.max(0, height - half_bar)}
                on_change={this.move_horizontal}
              />
            </>
          )}
        </Layout>
      </>
    );
  }
}

export default StudyPoints;
