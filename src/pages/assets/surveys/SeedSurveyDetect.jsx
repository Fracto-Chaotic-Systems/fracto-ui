import React, { Component } from "react";
import PropTypes from "prop-types";

import AppText from "../../../AppText.jsx";
import { KEY_ASSETS_SURVEYS_DETECT } from "../../../text/AssetsText.jsx";

/** Detect-tab scaffold; future detection state and jobs belong here. */
export class SeedSurveyDetect extends Component {
  static propTypes = {
    focal_point: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
  };

  render() {
    const { width_px, height_px } = this.props;
    return (
      <div
        aria-label={AppText.get(KEY_ASSETS_SURVEYS_DETECT)}
        style={{
          width: `${width_px}px`,
          height: `${height_px}px`,
          overflow: "hidden",
        }}
      />
    );
  }
}

export default SeedSurveyDetect;
