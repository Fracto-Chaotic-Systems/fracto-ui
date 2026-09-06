import React, { Component } from "react";
import PropTypes from "prop-types";

/**
 * Renders the lore styles view area.
 *
 * Dimensions are supplied by the owning splitter layout so this component
 * can work as a self-contained width-by-height block.
 */
export class LoreStylesView extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
  };

  render() {
    const { width_px, height_px } = this.props;
    return `LoreStylesView ${width_px}x${height_px}`;
  }
}

export default LoreStylesView;
