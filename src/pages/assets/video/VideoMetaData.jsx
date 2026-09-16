import React, { Component } from "react";
import PropTypes from "prop-types";

import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import CoolTree, { normalize_tree_data } from "../../../utils/ui/CoolTree.jsx";

/** Renders the metadata editing area for a video project. */
export class VideoMetaData extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
    selected_video: PropTypes.object,
    on_video_change: PropTypes.func,
  };

  get_meta = () => {
    const { selected_video } = this.props;
    let meta = selected_video?.meta;
    if (typeof meta === "string") {
      try {
        meta = JSON.parse(meta);
      } catch (error) {
        meta = {};
      }
    }
    return meta && typeof meta === "object" ? meta : {};
  };

  render() {
    const { width_px, height_px } = this.props;
    const tree_data = normalize_tree_data(this.get_meta(), "meta");
    return (
      <CoolStyles.Block
        style={{
          width: `${width_px}px`,
          height: `${height_px}px`,
          overflow: "hidden",
        }}
      >
        <CoolTree
          tree_data={tree_data}
          default_expanded_keys={["root"]}
          searchable={false}
          editable={false}
          tree_label="video metadata"
        />
      </CoolStyles.Block>
    );
  }
}

export default VideoMetaData;
