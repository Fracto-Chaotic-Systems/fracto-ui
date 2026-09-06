import React, { Component } from "react";
import PropTypes from "prop-types";

import { MainStyles as styles } from "../../../styles/MainStyles.jsx";
import AppSettings from "../../../AppSettings.jsx";
import {
  KEY_ASSETS_GALLERY_RENDER_SPLITTER_POS,
  KEY_ASSETS_SPLITTER_POS_PX,
} from "../../../settings/AssetsSettings.jsx";

import { GALLERY_TABLE_WIDTH_PX } from "./GalleryList.jsx";
import { SPLITTER_WIDTH_PX } from "../../../constants.jsx";
import FractoRasterImage from "../../../utils/render/FractoRasterImage.jsx";
import FieldsColorWheel from "../../../utils/render/FieldsColorWheel.jsx";
import { BACKGROUND_FIELD_GRADIENT } from "../../../constants.jsx";

const IMAGE_SIZE_DELTA = 50;

export class GalleryLeftPanel extends Component {
  static propTypes = {
    asset: PropTypes.object.isRequired,
    container_bounds: PropTypes.object.isRequired,
    ready: PropTypes.bool.isRequired,
  };

  state = {
    canvas_buffer: [],
  };

  on_ready = (canvas_buffer) => {
    this.setState({
      canvas_buffer,
      ready: true,
    });
  };

  render() {
    const { canvas_buffer } = this.state;
    const { ready, container_bounds, asset } = this.props;
    if (!asset?.scope) {
      return [];
    }
    const rendered_splitter_pos = AppSettings.get(
      KEY_ASSETS_GALLERY_RENDER_SPLITTER_POS,
    );
    const study_splitter_pos = AppSettings.get(KEY_ASSETS_SPLITTER_POS_PX);
    const width =
      rendered_splitter_pos -
      study_splitter_pos -
      GALLERY_TABLE_WIDTH_PX -
      SPLITTER_WIDTH_PX;
    const width_px = Math.floor(width / IMAGE_SIZE_DELTA) * IMAGE_SIZE_DELTA;
    const margin = (width - width_px) / 2;
    const panel_style = {
      top: `${container_bounds.top}px`,
      left: `${container_bounds.left + GALLERY_TABLE_WIDTH_PX}px`,
      width: `${width}px`,
      height: `${container_bounds.height}px`,
      background: BACKGROUND_FIELD_GRADIENT,
    };
    const image_style = {
      margin: `${margin}px auto`,
      width: `${width_px}px`,
      height: `${width_px}px`,
      boxShadow: "5px 5px 10px rgba(0, 0, 0, 0.25)",
      backgroundColor: "#f8f8f8",
      cursor: ready ? "crosshair" : "wait",
    };
    const asset_focal_point = {
      x: asset.focal_point_x,
      y: asset.focal_point_y,
    };
    const color_wheel_style = {
      borderRadius: "50%",
      filter: `drop-shadow(-8px 8px 8px rgba(0, 0, 0, 0.25))`,
      textAlign: "center",
    };
    return (
      <styles.FixedInlineBlock style={panel_style}>
        <div style={image_style}>
          <FractoRasterImage
            width_px={width_px}
            focal_point={asset_focal_point}
            scope={asset.scope}
            on_plan_complete={this.on_ready}
          />
        </div>
        <div style={color_wheel_style}>
          <FieldsColorWheel width_px={width_px} canvas_buffer={canvas_buffer} />
        </div>
      </styles.FixedInlineBlock>
    );
  }
}

export default GalleryLeftPanel;
