import React, {Component} from 'react';
import PropTypes from 'prop-types';

export class NavigatorField extends Component {
   static propTypes = {
      bounding_rect: PropTypes.object.isRequired,
      frame_settings: PropTypes.object.isRequired,
   }

   render() {
      const {bounding_rect} = this.props
      return `NavigatorField ${bounding_rect.width}x${bounding_rect.height}`;
   }
}

export default NavigatorField
