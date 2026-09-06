import React, { Component } from "react";
import PropTypes from "prop-types";

/**
 * Renders the catalog area of the lore styles view.
 */
export class LoreStylesCatalog extends Component {
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
          backgroundColor: "#fff1b8",
          padding: "3px",
        }}
      >
        {`LoreStylesCatalog ${width_px}x${height_px}`}
      </div>
    );
  }
}

export default LoreStylesCatalog;
