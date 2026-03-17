import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {NavigatorStyles as styles} from '../styles/NavigatorStyles.jsx';
import {copy_json} from "../utils/Dom.jsx";
import AppSettings from "../AppSettings.jsx";
import {
   KEY_NAVIGATOR_CLIENT_POINT,
   KEY_NAVIGATOR_HOVER_POINT,
   KEY_NAVIGATOR_SHOW_CROSSHAIRS
} from "../settings/NavigatorSettings.jsx";

import FractoRasterImage from "../utils/render/FractoRasterImage.jsx";
import NavigatorUtils from "./NavigatorUtils.jsx";

const IMAGE_SIZE_DELTA = 50
const ZOOM_FACTOR = 1.5
const ZOOM_FACTOR_MINOR = 1.5
const ZOOM_FACTOR_MAJOR = 3.0

export class NavigatorField extends Component {
   static propTypes = {
      bounding_rect: PropTypes.object.isRequired,
      frame_settings: PropTypes.object.isRequired,
      frame_settings_key: PropTypes.number.isRequired,
   }

   state = {
      image_ref: React.createRef(),
      width_px: 1,
      saved_bounding_rect: {},
      show_crosshairs: false,
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
      const {bounding_rect, frame_settings, frame_settings_key} = this.props
      const largest_width_px = Math
         .min(bounding_rect.width, bounding_rect.height)
      const width_px = Math
         .floor(largest_width_px / IMAGE_SIZE_DELTA) * IMAGE_SIZE_DELTA
      if (frame_settings.focal_point) {
         let copy_frame_settings = copy_json(frame_settings)
         copy_frame_settings.width_px = width_px
         AppSettings.on_settings_changed({
            [frame_settings_key]: copy_frame_settings
         })
      }
      this.setState({
         width_px,
         saved_bounding_rect: copy_json(bounding_rect)
      })
   }

   get_mouse_pos = (e) => {
      const {image_ref, width_px} = this.state
      const {frame_settings} = this.props
      const {focal_point, scope} = frame_settings
      const inspector_bounds = {
         left: focal_point.x - scope / 2, top: focal_point.y + scope / 2,
      }
      const image_wrapper = image_ref.current
      if (!image_wrapper) {
         return {}
      }
      const bounds = image_wrapper.getBoundingClientRect()
      const increment = scope / width_px
      const x = inspector_bounds.left + increment * (e.clientX - bounds.x)
      const y = inspector_bounds.top - increment * (e.clientY - bounds.y)
      return {
         x, y,
         clientX: e.clientX,
         clientY: e.clientY,
         image_bounds: bounds
      }
   }

   on_mousemove = (e) => {
      const location = this.get_mouse_pos(e)
      AppSettings.on_settings_changed({
         [KEY_NAVIGATOR_HOVER_POINT]: {
            x: location.x,
            y: location.y
         },
         [KEY_NAVIGATOR_CLIENT_POINT]: {
            x: location.clientX,
            y: location.clientY
         },
         [KEY_NAVIGATOR_SHOW_CROSSHAIRS]: true
      })
      this.setState({show_crosshairs: true})
   }

   on_mouseleave = (e) => {
      AppSettings.on_settings_changed({
         [KEY_NAVIGATOR_HOVER_POINT]: {x: 0, y: 0},
         [KEY_NAVIGATOR_CLIENT_POINT]: {x: 0, y: 0},
         [KEY_NAVIGATOR_SHOW_CROSSHAIRS]: false
      })
      this.setState({show_crosshairs: false})
   }

   on_wheel = (e) => {
      const {frame_settings, frame_settings_key} = this.props
      const {scope} = frame_settings
      let zoom_factor = e.shiftKey ? ZOOM_FACTOR_MAJOR : ZOOM_FACTOR
      if (e.altKey) {
         zoom_factor = ZOOM_FACTOR_MINOR
      }
      frame_settings.scope = e.deltaY > 0
         ? scope * zoom_factor
         : scope / zoom_factor
      AppSettings.on_settings_changed({
         [frame_settings_key]: frame_settings
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

   on_plan_complete = (canvas_buffer) => {
      const {frame_settings, frame_settings_key} = this.props
      const {width_px} = this.state
      AppSettings.on_settings_changed({
         [frame_settings_key]: {
            focal_point: frame_settings.focal_point,
            scope: frame_settings.scope,
            width_px,
         }
      })
   }

   render() {
      const {image_ref, width_px, show_crosshairs} = this.state
      const {bounding_rect, frame_settings} = this.props
      if (!frame_settings.focal_point || !frame_settings.scope) {
         return []
      }
      const wrapper_style = {
         marginTop: `${(bounding_rect.height - width_px) / 2}px`
      };
      const client_point = AppSettings.get(KEY_NAVIGATOR_CLIENT_POINT)
      const crosshairs = show_crosshairs
         ? NavigatorUtils.render_cross_hairs(
            bounding_rect, client_point, this.on_click)
         : []
      return [
         <styles.ImageWrapper
            onClick={this.on_click}
            onMouseMove={this.on_mousemove}
            onMouseLeave={this.on_mouseleave}
            onWheel={this.on_wheel}
            style={wrapper_style}
            key={'image-wrapper'}
            ref={image_ref}>
            <FractoRasterImage
               width_px={width_px}
               focal_point={frame_settings.focal_point}
               scope={frame_settings.scope}
               on_plan_complete={this.on_plan_complete}
            />
         </styles.ImageWrapper>,
         crosshairs,
      ]
   }
}

export default NavigatorField
