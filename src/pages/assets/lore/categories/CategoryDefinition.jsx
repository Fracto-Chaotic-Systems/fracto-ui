import React, {Component} from "react";
import PropTypes from "prop-types";

export class CategoryDefinition extends Component {
   static propTypes = {
      id: PropTypes.number.isRequired,
      width_px: PropTypes.number.isRequired,
      height_px: PropTypes.number.isRequired,
   }

   render() {
      const {id, width_px, height_px} = this.props;
      return `${id < 0 ? 'new ' : ''}CategoryDefinition (${width_px}x${height_px})`
   }
}

export default CategoryDefinition
