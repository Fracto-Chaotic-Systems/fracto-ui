import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {NavigatorStyles as styles} from "../styles/NavigatorStyles.jsx";

export class NavigatorLegend extends Component {
   static propTypes = {
      bounding_rect: PropTypes.object.isRequired,
      frame_settings: PropTypes.object.isRequired,
   }

   render() {
      const {bounding_rect} = this.props
      return `NavigatorLegend ${bounding_rect.width}x${bounding_rect.height}`;
   }
}

export default NavigatorLegend
