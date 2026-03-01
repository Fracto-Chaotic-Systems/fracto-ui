import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {NavigatorStyles as styles} from '../src/styles/NavigatorStyles.jsx'
import CoolSplitter, {
   SPLITTER_TYPE_HORIZONTAL,
   SPLITTER_TYPE_VERTICAL
} from "../src/utils/ui/CoolSplitter.jsx";

export const SPLITTER_WIDTH_PX = 4;

const LS_LEFT_PANE_POSITION = 'ls_left_pane_position'
const LS_LEFT_PANE_DEFAULT = 650
const LS_UPPER_PANE_POSITION = 'ls_upper_pane_position'
const LS_UPPER_PANE_DEFAULT = 150

export const UPPER_LEFT_WIDTH_KEY = 'upper_left_width'
export const UPPER_RIGHT_WIDTH_KEY = 'upper_right_width'
export const UPPER_HEIGHT_KEY = 'upper_height'
export const LOWER_HEIGHT_KEY = 'lower_height'

export class FractoNavigatorNot extends Component {

   static propTypes = {
      width_px: PropTypes.number.isRequired,
      height_px: PropTypes.number.isRequired,
      pane_steps: PropTypes.array.isRequired,
      pane_field: PropTypes.array.isRequired,
      pane_legend: PropTypes.array.isRequired,
      on_settings_changed: PropTypes.func
   }

   state = {
      left_pane_ref: React.createRef(),
      left_pane_position: 200,
      upper_pane_ref: React.createRef(),
      upper_pane_position: 200,
      bounds: {}
   };

   componentDidMount() {
      const {left_pane_ref} = this.state
      console.log('page ready')
      if (left_pane_ref.current) {
         const bounds = left_pane_ref.current.getBoundingClientRect()
         this.setState({bounds})
      }

      const left_pane_position_str = localStorage.getItem(LS_LEFT_PANE_POSITION);
      let left_pane_position = LS_LEFT_PANE_DEFAULT
      if (left_pane_position_str) {
         left_pane_position = parseInt(left_pane_position_str, 10)
      }
      const upper_pane_position_str = localStorage.getItem(LS_UPPER_PANE_POSITION);
      let upper_pane_position = LS_UPPER_PANE_DEFAULT
      if (upper_pane_position_str) {
         upper_pane_position = parseInt(upper_pane_position_str, 10)
      }
      this.change_left_pane_position(left_pane_position)
      this.change_upper_pane_position(upper_pane_position)
   }

   change_left_pane_position = (new_position) => {
      const {bounds} = this.state
      const {height_px, on_settings_changed} = this.props
      const new_settings = {[UPPER_HEIGHT_KEY]: new_position}
      if (height_px) {
         new_settings[LOWER_HEIGHT_KEY] = height_px - new_position - 20
      }
      if (on_settings_changed) {
         on_settings_changed(new_settings)
      }
      localStorage.setItem(LS_LEFT_PANE_POSITION, `${new_position}`)
      this.setState({
         left_pane_position:parseInt (new_position) + bounds.top
      })
   }

   change_upper_pane_position = (new_position) => {
      const {width_px, on_settings_changed} = this.props
      const new_settings = {[UPPER_LEFT_WIDTH_KEY]: new_position}
      if (width_px) {
         new_settings[UPPER_RIGHT_WIDTH_KEY] = width_px - new_position
      }
      if (on_settings_changed) {
         on_settings_changed(new_settings)
      }
      this.setState({upper_pane_position: new_position})
      localStorage.setItem(LS_UPPER_PANE_POSITION, `${new_position}`)
   }

   render_upper_panes = (width_px, height_px) => {
      const {upper_pane_ref, upper_pane_position} = this.state
      const {pane_steps, pane_field} = this.props
      let bounds = {width: 1, height: 1}
      if (upper_pane_ref.current) {
         const boundsData = upper_pane_ref.current.getBoundingClientRect()
         bounds.height = boundsData.height
      }
      const left_part_style = {
         height: `${height_px}px`,
         width: `${upper_pane_position}px`,
         backgroundColor: '#e7e7e7',
      }
      const right_part_style = {
         height: `${height_px}px`,
         width: `${width_px - upper_pane_position}px`,
         backgroundColor: '#666666',
         top: bounds.top,
      }
      const upper_pane_content = [
         <styles.UpperPaneWrapper
            style={left_part_style}
            key={'upper-left-pane'}>
            {pane_steps}
         </styles.UpperPaneWrapper>,
         <CoolSplitter
            key={'upper-pane-splitter-bar'}
            style={{height: bounds.height}}
            type={SPLITTER_TYPE_VERTICAL}
            name={'vertical=upper-pane'}
            bar_width_px={SPLITTER_WIDTH_PX}
            container_bounds={bounds}
            position={upper_pane_position}
            on_change={this.change_upper_pane_position}
         />,
         <styles.UpperPaneWrapper
            style={right_part_style}
            key={'upper-right-pane'}>
            {pane_field}
         </styles.UpperPaneWrapper>,
      ]
      const pane_style = {width: `${width_px}px`, height: `${height_px}px`}
      return <styles.LeftPaneWrapper style={pane_style} ref={upper_pane_ref}>
         {upper_pane_content}
      </styles.LeftPaneWrapper>
   }

   render() {
      const {left_pane_ref, left_pane_position} = this.state
      const {height_px, width_px, pane_legend} = this.props
      let bounds = {width: 1, height: 1}
      if (left_pane_ref.current) {
         bounds = left_pane_ref.current.getBoundingClientRect()
         console.log('FractoNavigator bounds', bounds)
      }
      const upper_part_style = {
         height: `${left_pane_position - 1}px`,
         marginBottom: '3px',
         left: `${bounds.left}px`
      }
      const lower_part_style = {
         height: `${height_px - left_pane_position - 20}px`,
         backgroundColor: '#eeeeee',
         left: `${bounds.left}px`
      }
      const left_pane_content = [
         <styles.PanelWrapper
            style={upper_part_style}
            key={'upper-part'}>
            {this.render_upper_panes(width_px, left_pane_position)}
         </styles.PanelWrapper>,
         <CoolSplitter
            key={'lower-pane-splitter-bar'}
            type={SPLITTER_TYPE_HORIZONTAL}
            name={'horizontal-left-pane'}
            bar_width_px={SPLITTER_WIDTH_PX}
            container_bounds={bounds}
            position={left_pane_position}
            on_change={this.change_left_pane_position}/>,
         <styles.PanelWrapper
            style={lower_part_style}
            key={'lower-part'}>
            {pane_legend}
         </styles.PanelWrapper>,
      ]
      const pane_style = {width: `${width_px}px`, height: `${height_px}px`}
      return <styles.LeftPaneWrapper style={pane_style} ref={left_pane_ref}>
         {left_pane_content}
      </styles.LeftPaneWrapper>
   }
}

export default FractoNavigatorNot;
