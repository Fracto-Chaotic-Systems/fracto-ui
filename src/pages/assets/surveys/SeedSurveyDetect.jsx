import React, { Component } from "react";
import PropTypes from "prop-types";

import AppText from "../../../AppText.jsx";
import SeedSurveyCanvas from "./SeedSurveyCanvas.jsx";
import {
  KEY_ASSETS_SURVEYS_DETECT,
  KEY_ASSETS_SURVEYS_CANVAS_DETECT,
} from "../../../text/AssetsText.jsx";

/** Detection view with a coarse sample grid scaled to its display canvas. */
export class SeedSurveyDetect extends Component {
  static propTypes = {
    focal_point: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
  };

  render() {
    const { width_px, height_px, focal_point } = this.props;
    return (
      <div
        aria-label={AppText.get(KEY_ASSETS_SURVEYS_DETECT)}
        style={{
          width: `${width_px}px`,
          height: `${height_px}px`,
          overflow: "auto",
          textAlign: "left",
        }}
      >
        <SeedSurveyCanvas
          focal_point={focal_point}
          size_px={350}
          source_size_px={150}
          half_span={1.5}
          iteration_limit={100000}
          aria_label={AppText.get(KEY_ASSETS_SURVEYS_CANVAS_DETECT)}
        />
      </div>
    );
  }
}

export default SeedSurveyDetect;
