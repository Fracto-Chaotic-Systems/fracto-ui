import React, { Component } from "react";
import PropTypes from "prop-types";

import { MainStyles as styles } from "../../../styles/MainStyles.jsx";
import AppSettings from "../../../AppSettings.jsx";
import {
  KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS,
  KEY_STUDY_SPLITTER_POS_PX,
} from "../../../settings/StudySettings.jsx";
import { TABLE_WIDTH_PX } from "./MinibrotList.jsx";
import { SPLITTER_WIDTH_PX } from "../../../constants.jsx";

import FractoRasterImage from "../../../utils/render/FractoRasterImage.jsx";
import FractoOrbitalChart from "../../../utils/render/FractoOrbitalChart.jsx";
import CoolTabs from "../../../utils/ui/CoolTabs.jsx";
import FieldsColorWheel from "../../../utils/render/FieldsColorWheel.jsx";

const IMAGE_SIZE_DELTA = 50;
const TAB_LABELS = ["orbital", "patterns"];

export class MinibrotLeftPanel extends Component {
  static propTypes = {
    selected_minibrot: PropTypes.object.isRequired,
    container_bounds: PropTypes.object.isRequired,
    on_ready: PropTypes.func.isRequired,
    ready: PropTypes.bool.isRequired,
    canvas_buffer: PropTypes.array.isRequired,
  };

  state = {
    in_animation: false,
    core_point: null,
    selected_tab: 0,
  };

  componentDidMount() {
    this.update_core_point();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const selected_minibrot_changed =
      this.props.selected_minibrot?.id !== prevProps.selected_minibrot.id;
    if (selected_minibrot_changed) {
      setTimeout(this.update_core_point, 5000);
    }
  }

  update_core_point() {
    const { selected_minibrot } = this.props;
    const core_point = JSON.parse(selected_minibrot.core_point);
    this.setState({ core_point, in_animation: false });
  }

  on_click_chart = () => {
    const { in_animation } = this.state;
    this.setState({ in_animation: !in_animation });
  };

  on_select_tab = (selected_tab) => {
    this.setState({ selected_tab });
  };

  render_tab_content = () => {
    const { selected_tab } = this.state;
    const { selected_minibrot, canvas_buffer } = this.props;
    const study_splitter_pos = AppSettings.get(KEY_STUDY_SPLITTER_POS_PX);
    const rendered_splitter_pos = AppSettings.get(
      KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS,
    );
    const width =
      rendered_splitter_pos -
      study_splitter_pos -
      TABLE_WIDTH_PX -
      SPLITTER_WIDTH_PX;
    const width_px = Math.floor(width / IMAGE_SIZE_DELTA) * IMAGE_SIZE_DELTA;
    const margin = (width - width_px) / 2;
    const core_point = JSON.parse(selected_minibrot.core_point);
    const chart_style = {
      margin: `${margin}px auto`,
      width: `${width_px}px`,
      height: `${width_px}px`,
      boxShadow: "5px 5px 10px rgba(0, 0, 0, 0.25)",
      backgroundColor: "#f8f8f8",
      cursor: "pointer",
    };
    switch (selected_tab) {
      case 0: {
        return (
          <div onClick={this.on_click_chart} style={chart_style}>
            <FractoOrbitalChart
              key={selected_minibrot.id}
              width_px={width_px}
              focal_point={core_point}
              in_animation={false}
              ready={true}
            />
          </div>
        );
      }
      case 1:
        return (
          <div style={chart_style}>
            <FieldsColorWheel
              width_px={width_px}
              canvas_buffer={canvas_buffer}
            />
          </div>
        );
      default: {
        console.log("selected_tab", selected_tab);
        return [];
      }
    }
  };

  render() {
    const { selected_tab } = this.state;
    const { selected_minibrot, container_bounds, on_ready } = this.props;
    if (!selected_minibrot.pattern) {
      return [];
    }
    const rendered_splitter_pos = AppSettings.get(
      KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS,
    );
    const display_settings = JSON.parse(selected_minibrot.display_settings);
    // console.log('MinibrotLeftPanel, core_point, display_settings', core_point, display_settings)

    const top = container_bounds.top;
    const left = container_bounds.left;
    const study_splitter_pos = AppSettings.get(KEY_STUDY_SPLITTER_POS_PX);
    const width =
      rendered_splitter_pos -
      study_splitter_pos -
      TABLE_WIDTH_PX -
      SPLITTER_WIDTH_PX;
    const width_px = Math.floor(width / IMAGE_SIZE_DELTA) * IMAGE_SIZE_DELTA;
    const margin = (width - width_px) / 2;
    const panel_style = {
      top: `${top}px`,
      left: `${left + TABLE_WIDTH_PX}px`,
      width: `${width}px`,
      height: `${container_bounds.height}px`,
      backgroundColor: "#e4e4e4",
    };
    const image_style = {
      margin: `${margin}px auto`,
      width: `${width_px}px`,
      height: `${width_px}px`,
      boxShadow: "5px 5px 10px rgba(0, 0, 0, 0.25)",
      backgroundColor: "#f8f8f8",
      marginBottom: "10px",
    };
    // console.log("width_px, display_settings", width_px, display_settings)
    const selected_content = this.render_tab_content();
    return (
      <styles.FixedInlineBlock style={panel_style}>
        <div style={image_style}>
          <FractoRasterImage
            width_px={width_px}
            focal_point={display_settings.focal_point}
            scope={display_settings.scope}
            on_plan_complete={on_ready}
          />
        </div>
        <CoolTabs
          labels={TAB_LABELS}
          tab_index={selected_tab}
          on_tab_select={this.on_select_tab}
          selected_content={selected_content}
        />
      </styles.FixedInlineBlock>
    );
  }
}

export default MinibrotLeftPanel;
