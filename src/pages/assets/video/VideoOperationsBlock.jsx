import React, { Component } from "react";
import PropTypes from "prop-types";

import AppSettings from "../../../AppSettings.jsx";
import AppText from "../../../AppText.jsx";
import { SPLITTER_WIDTH_PX } from "../../../constants.jsx";
import CoolSplitter, {
  SPLITTER_LAYOUT_FLOW,
  SPLITTER_TYPE_VERTICAL,
} from "../../../utils/ui/CoolSplitter.jsx";
import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import { KEY_VIDEO_OPERATIONS_SPLITTER_POS } from "../../../settings/AssetsSettings.jsx";
import { KEY_VIDEO_ASSETS_OPERATIONS } from "../../../text/AssetsText.jsx";

export class VideoOperationsBlock extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
    video_script: PropTypes.object,
    on_update_script: PropTypes.func.isRequired,
  };

  state = {
    splitter_position: null,
    panel_ref: React.createRef(),
  };

  componentDidMount() {
    const stored_position = Number(
      AppSettings.get(KEY_VIDEO_OPERATIONS_SPLITTER_POS),
    );
    if (stored_position > 0) {
      this.setState({ splitter_position: stored_position });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { width_px } = this.props;
    const { splitter_position } = this.state;
    if (
      width_px <= SPLITTER_WIDTH_PX * 2 ||
      (width_px === prevProps.width_px &&
        splitter_position === prevState.splitter_position)
    ) {
      return;
    }
    const min_position = width_px * 0.5;
    const max_position = width_px * 0.9;
    const bounded_position = Math.min(
      max_position,
      Math.max(min_position, splitter_position || width_px * 0.75),
    );
    if (bounded_position !== splitter_position) {
      this.setState({ splitter_position: bounded_position });
      AppSettings.on_settings_changed({
        [KEY_VIDEO_OPERATIONS_SPLITTER_POS]: bounded_position,
      });
    }
  }

  on_splitter_change = (absolute_position) => {
    this.setState({ splitter_position: absolute_position });
    AppSettings.on_settings_changed({
      [KEY_VIDEO_OPERATIONS_SPLITTER_POS]: absolute_position,
    });
  };

  render_content = () => {
    const { width_px, height_px } = this.props;
    const { splitter_position } = this.state;
    if (width_px <= SPLITTER_WIDTH_PX * 2 || height_px <= 0) {
      return null;
    }
    const min_position = width_px * 0.5;
    const max_position = width_px * 0.9;
    const local_position = Math.min(
      max_position,
      Math.max(min_position, splitter_position || width_px * 0.75),
    );
    const left_width = Math.max(0, local_position - SPLITTER_WIDTH_PX / 2);
    const right_width = Math.max(
      0,
      width_px - local_position - SPLITTER_WIDTH_PX / 2,
    );
    const pane_style = (width) => ({
      flex: `0 0 ${width}px`,
      width: `${width}px`,
      height: `${height_px}px`,
      overflow: "auto",
    });
    return (
      <>
        <CoolStyles.Block
          style={{
            display: "flex",
            width: `${width_px}px`,
            height: `${height_px}px`,
            overflow: "hidden",
          }}
        >
          <CoolStyles.Block style={pane_style(left_width)}>
            {AppText.get(KEY_VIDEO_ASSETS_OPERATIONS)}
          </CoolStyles.Block>
          <CoolSplitter
            type={SPLITTER_TYPE_VERTICAL}
            name={"video-operations-splitter"}
            bar_width_px={SPLITTER_WIDTH_PX}
            container_bounds={{
              left: 0,
              top: 0,
              width: SPLITTER_WIDTH_PX,
              height: height_px,
            }}
            position={local_position}
            on_change={this.on_splitter_change}
            layout={SPLITTER_LAYOUT_FLOW}
            min_position={min_position}
            max_position={max_position}
          />
          <CoolStyles.Block style={pane_style(right_width)} />
        </CoolStyles.Block>
      </>
    );
  };

  render() {
    const { video_script, width_px, height_px } = this.props;
    if (!video_script) {
      return [];
    }
    const panel_style = {
      boxSizing: "border-box",
      width: `${Math.max(0, width_px)}px`,
      height: `${Math.max(0, height_px)}px`,
      border: "1px solid #666666",
      borderRadius: "5px",
      backgroundColor: "white",
      overflow: "hidden",
    };
    return (
      <CoolStyles.InlineBlock ref={this.state.panel_ref} style={panel_style}>
        {this.render_content()}
      </CoolStyles.InlineBlock>
    );
  }
}

export default VideoOperationsBlock;
