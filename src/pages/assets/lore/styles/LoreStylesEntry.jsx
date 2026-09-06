import React, { Component } from "react";
import PropTypes from "prop-types";

/**
 * Renders one entry in the lore styles editor.
 *
 * The dimensions are supplied by the owning layout so this component can
 * render as a self-contained width-by-height block as the editor develops.
 */
export class LoreStylesEntry extends Component {
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
          backgroundColor: "#ffd1dc",
          padding: "3px",
        }}
      >
        {`LoreStylesEntry ${width_px}x${height_px}`}
      </div>
    );
  }
}

export default LoreStylesEntry;
