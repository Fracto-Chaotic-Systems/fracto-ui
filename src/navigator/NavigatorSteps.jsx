import React, {Component} from 'react';
import PropTypes from 'prop-types';

export class NavigatorSteps extends Component {
   static propTypes = {
      bounding_rect: PropTypes.object.isRequired,
      frame_settings: PropTypes.object.isRequired,
   }

   render() {
      const {bounding_rect} = this.props
      return `NavigatorSteps ${bounding_rect.width}x${bounding_rect.height}`;
   }
}

export default NavigatorSteps
