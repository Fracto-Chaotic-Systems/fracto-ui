import React, {Component} from 'react';
import PropTypes from 'prop-types';
import FractoRasterImage from "../utils/render/FractoRasterImage.jsx";
import AppSettings from "../AppSettings.jsx";
import {NavigatorStyles as styles} from '../styles/NavigatorStyles.jsx';

export class NavigatorField extends Component {
   static propTypes = {
      bounding_rect: PropTypes.object.isRequired,
      frame_settings: PropTypes.object.isRequired,
      frame_settings_key: PropTypes.number.isRequired,
   }

   state = {
      image_ref: React.createRef(),
   }

   componentDidMount() {
   }

   client_click = (e) => {
      const {image_ref} = this.state
      const container_bounds = image_ref.current.getBoundingClientRect()
      const x = Math.floor(e.clientX - container_bounds.left)
      const y = Math.floor(e.clientY - container_bounds.top)
      return {x, y, container_bounds, clientX: e.clientX, clientY: e.clientY}
   }

   on_click = (e) => {
      const {frame_settings, frame_settings_key} = this.props
      const {focal_point, scope} = frame_settings
      const client_click = this.client_click(e)
      const leftmost = focal_point.x - scope / 2
      const topmost = focal_point.y + scope / 2
      const increment = scope / client_click.container_bounds.width
      AppSettings.on_settings_changed({
         [frame_settings_key]:{
            focal_point: {
               x: leftmost + increment * client_click.x,
               y: topmost - increment * client_click.y,
            },
            scope: frame_settings.scope,
         }
      })
   }

   render() {
      const {image_ref} = this.state
      const {bounding_rect, frame_settings} = this.props
      if (!frame_settings.focal_point || !frame_settings.scope) {
         return []
      }
      return <styles.ImageWrapper
         onClick={this.on_click}
         ref={image_ref}>
         <FractoRasterImage
            width_px={500}
            focal_point={frame_settings.focal_point}
            scope={frame_settings.scope}
         />
      </styles.ImageWrapper>
   }
}

export default NavigatorField
