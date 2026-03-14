import React, {Component} from 'react';
import PropTypes from 'prop-types';

import NavigatorTransit from "./NavigatorTransit.jsx";
import {copy_json} from "../utils/Dom.js";
import AppSettings from "../AppSettings.jsx";

const TRANSITOR_HEIGHT_PX = 150

export class NavigatorLegend extends Component {
   static propTypes = {
      bounding_rect: PropTypes.object.isRequired,
      frame_settings: PropTypes.object.isRequired,
      frame_settings_key: PropTypes.string,
   }

   on_focal_point_changed = (focal_point) => {
      const {frame_settings, frame_settings_key} = this.props
      let new_settings = copy_json(frame_settings)
      new_settings.focal_point.x = focal_point.x;
      new_settings.focal_point.y = focal_point.y;
      AppSettings.on_settings_changed({
         [frame_settings_key]: new_settings
      })
   }

   render() {
      const {frame_settings} = this.props
      const transitor = <NavigatorTransit
         width_px={TRANSITOR_HEIGHT_PX}
         scope={frame_settings.scope}
         focal_point={frame_settings.focal_point}
         on_focal_point_changed={this.on_focal_point_changed}
         in_wait={false}
      />
      return [transitor];
   }
}

export default NavigatorLegend
