import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {NavigatorStyles as styles} from '../styles/NavigatorStyles.jsx';
import AppSettings from "../AppSettings.jsx";

import FractoRasterImage from "../utils/render/FractoRasterImage.jsx";
import {copy_json} from "../utils/Dom.js";

const IMAGE_SIZE_DELTA = 50

export class NavigatorField extends Component {
   static propTypes = {
      bounding_rect: PropTypes.object.isRequired,
      frame_settings: PropTypes.object.isRequired,
      frame_settings_key: PropTypes.number.isRequired,
   }

   state = {
      image_ref: React.createRef(),
      width_px: 0,
      saved_bounding_rect: {},
   }

   componentDidMount() {
      this.adjust_canvas_size()
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
      const width_changed =
         prevState.saved_bounding_rect.width !== this.props.bounding_rect.width
      const height_changed =
         prevState.saved_bounding_rect.height !== this.props.bounding_rect.height
      if (width_changed || height_changed) {
         this.adjust_canvas_size()
      }
   }

   adjust_canvas_size = () => {
      const {bounding_rect} = this.props
      const largest_width_px = Math
         .min(bounding_rect.width, bounding_rect.height)
      const width_px = Math
         .floor(largest_width_px / IMAGE_SIZE_DELTA) * IMAGE_SIZE_DELTA
      this.setState({
         width_px,
         saved_bounding_rect: copy_json(bounding_rect)
      })
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
         [frame_settings_key]: {
            focal_point: {
               x: leftmost + increment * client_click.x,
               y: topmost - increment * client_click.y,
            },
            scope: frame_settings.scope,
         }
      })
   }

   render() {
      const {image_ref, width_px} = this.state
      const {bounding_rect, frame_settings} = this.props
      if (!frame_settings.focal_point || !frame_settings.scope) {
         return []
      }
      const wrapper_style = {
         marginTop: `${(bounding_rect.height - width_px) / 2}px`
      };
      return <styles.ImageWrapper
         onClick={this.on_click}
         style={wrapper_style}
         ref={image_ref}>
         <FractoRasterImage
            width_px={width_px}
            focal_point={frame_settings.focal_point}
            scope={frame_settings.scope}
         />
      </styles.ImageWrapper>
   }
}

export default NavigatorField
