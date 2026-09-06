import React, { Component } from "react";
import PropTypes from "prop-types";

/**
 * Renders the lore styles editing area as a width-by-height block.
 */
export class LoreStylesEdit extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
  };

  render() {
    const { width_px, height_px } = this.props;
    return (
      <div
        style={{
          width: `${width_px}px`,
          height: `${height_px}px`,
          backgroundColor: "#d9f7be",
          padding: "3px",
        }}
      >
        {`LoreStylesEdit ${width_px}x${height_px}`}
      </div>
    );
  }
}

export default LoreStylesEdit;
