import React, { Component } from "react";
import PropTypes from "prop-types";

/**
 * Renders the inventory area of the lore styles view.
 */
export class LoreStylesInventory extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
  };

  render() {
    const { width_px, height_px } = this.props;
    return `LoreStylesInventory ${width_px}x${height_px}`;
  }
}

export default LoreStylesInventory;
