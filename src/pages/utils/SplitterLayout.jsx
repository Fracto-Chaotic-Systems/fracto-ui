import React, {Component} from 'react'

import {CoolSplitter, SPLITTER_TYPE_VERTICAL} from "../../ui/CoolSplitter.jsx";
import {DEFAULT_SIDEBAR_WIDTH, HEADER_BAR_HEIGHT_PX} from "../../constants.jsx";
import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppSettings from "../../AppSettings.jsx";
import {copy_json} from "../../utils/Dom.js";
import {KEY_VIEWPORT_DIMENSIONS, poll_viewport_dimensions} from "../../settings/RootSettings.jsx";
import PropTypes from "prop-types";

export const SPLITTER_WIDTH_PX = 4;
const SPLITTER_MIN_FACTOR = 0.075;
const SPLITTER_MAX_FACTOR = 0.20;

export class SplitterLayout extends Component {
   static propTypes = {
      left_content: PropTypes.array.isRequired,
      right_content: PropTypes.array.isRequired,
      splitter_pos_key: PropTypes.string.isRequired,
   }

   state = {
      container_ref: React.createRef(),
      container_bounds: {},
      splitter_position: DEFAULT_SIDEBAR_WIDTH,
      viewport_interval: null,
      viewport_dimensions: {width: 0, height: 0},
   }

   componentDidMount() {
      this.initialize()
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
      const {splitter_position} = this.state
      const {splitter_pos_key} = this.props
      const current_splitter_pos = AppSettings.get(splitter_pos_key)
      if (splitter_position !== current_splitter_pos) {
         setTimeout(this.initialize, 100)
      }
   }

   componentWillUnmount() {
      this.cleanup()
   }

   cleanup = () => {
      const {viewport_interval} = this.state
      if (viewport_interval) {
         clearInterval(viewport_interval)
      }
   }

   initialize = () => {
      const {container_ref} = this.state
      this.cleanup()
      const container = container_ref.current
      if (container) {
         let container_bounds_u = container.getBoundingClientRect()
         const container_bounds = copy_json(container_bounds_u)
         container_bounds.top = HEADER_BAR_HEIGHT_PX
         this.setState({container_bounds})
      }
      const viewport_interval = poll_viewport_dimensions(viewport_dimensions => {
         this.setState({
            viewport_dimensions,
            splitter_position: AppSettings.get(this.props.splitter_pos_key)
         })
      })
      this.setState({viewport_interval})
   }

   resize_panes = (splitter_position) => {
      // console.log('splitter_position', splitter_position)
      const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS)
      if (splitter_position < viewport_dimensions.width * SPLITTER_MIN_FACTOR) {
         splitter_position = viewport_dimensions.width * SPLITTER_MIN_FACTOR
      }
      if (splitter_position > viewport_dimensions.width * SPLITTER_MAX_FACTOR) {
         splitter_position = viewport_dimensions.width * SPLITTER_MAX_FACTOR
      }
      const {splitter_pos_key} = this.props
      AppSettings.on_settings_changed({
         [splitter_pos_key]: parseInt(splitter_position)
      })
      this.setState({splitter_position})
   }

   render_left_pane = () => {
      const {splitter_position, viewport_dimensions} = this.state
      const {left_content} = this.props
      if (!splitter_position) {
         return ''
      }
      const wrapper_style = {
         width: `${splitter_position + SPLITTER_WIDTH_PX}px`,
         height: `${viewport_dimensions.height - HEADER_BAR_HEIGHT_PX}px`,
         backgroundColor: 'lightyellow',
         marginTop: `${HEADER_BAR_HEIGHT_PX}px`
      }
      return <styles.ContentWrapper
         style={wrapper_style}>
         {left_content}
      </styles.ContentWrapper>
   }

   render_right_pane = () => {
      const {splitter_position, viewport_dimensions} = this.state
      const {right_content} = this.props
      if (!splitter_position) {
         return ''
      }
      const wrapper_style = {
         width: `${viewport_dimensions.width - splitter_position - SPLITTER_WIDTH_PX}px`,
         height: `${viewport_dimensions.height - HEADER_BAR_HEIGHT_PX}px`,
         backgroundColor: 'lightcyan',
         marginTop: `${HEADER_BAR_HEIGHT_PX}px`
      }
      return <styles.ContentWrapper
         style={wrapper_style}>
         {right_content}
      </styles.ContentWrapper>
   }

   render() {
      const {container_ref, container_bounds, splitter_position, viewport_dimensions} = this.state
      const {splitter_pos_key} = this.props
      const splitter = <CoolSplitter
         type={SPLITTER_TYPE_VERTICAL}
         name={splitter_pos_key}
         bar_width_px={SPLITTER_WIDTH_PX}
         container_bounds={container_bounds}
         position={splitter_position}
         on_change={this.resize_panes}
      />
      const copied_dimensions = copy_json(viewport_dimensions)
      copied_dimensions.height -= 1
      const left_pane = this.render_left_pane()
      const right_pane = this.render_right_pane()
      return <styles.BodyWrapper
         style={copied_dimensions}
         ref={container_ref}>
         {left_pane}
         {splitter}
         {right_pane}
      </styles.BodyWrapper>
   }
}

export default SplitterLayout