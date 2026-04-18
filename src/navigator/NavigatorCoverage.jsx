import React, {Component} from "react";
import PropTypes from "prop-types";

import {
   MainStyles as styles,
   MARGIN_PX,
   SECTION_BAR_HEIGHT_PX,
} from '../styles/MainStyles.jsx'
import AppSettings from "../AppSettings.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../settings/RootSettings.jsx";

import NavigatorSplitterLayout from "./NavigatorSplitterLayout.jsx";
import FractoTileCoverage from "../utils/render/FractoTileCoverage.jsx";

const UPDATE_INTERVAL_MS = 1000

export class NavigatorCoverage extends Component {
   static propTypes = {
      splitter_keys: PropTypes.object.isRequired,
      control_block: PropTypes.array.isRequired,
      results_block: PropTypes.array.isRequired,
      on_coverage_data: PropTypes.func.isRequired,
   }

   state = {
      rendered_width: 0,
      rendered_height: 0,
      interval: null,
      container_ref: React.createRef(),
      frame_settings: {},
      subscription: null,
   }

   componentDidMount() {
      const {splitter_keys} = this.props
      const frame_settings = AppSettings
         .get(splitter_keys.frame_settings_key)
      this.setState({
         frame_settings,
         interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
         subscription: AppSettings
            .subscribe(splitter_keys.frame_settings_key, this.on_frame_settings_changed)
      })
   }

   componentWillUnmount() {
      const {interval, subscription} = this.state
      if (interval) {
         clearInterval(interval)
      }
      if (subscription) {
         AppSettings.unsubscribe(subscription)
      }
   }

   on_frame_settings_changed = async (key, value) => {
      this.setState({frame_settings: value})
   }

   update_dimensions = () => {
      const {rendered_width, rendered_height} = this.state;
      const {splitter_keys} = this.props
      const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS)
      const splitter_width = AppSettings.get(splitter_keys.section_key)
      const rendered_width_changed = rendered_width !== viewport_dimensions.width - splitter_width
      const rendered_height_changed = rendered_height !== viewport_dimensions.height
      if (rendered_height_changed || rendered_width_changed) {
         this.setState({
            rendered_width: viewport_dimensions.width - splitter_width,
            rendered_height: viewport_dimensions.height,
         })
      }
   }

   render() {
      const {
         container_ref,
         rendered_height,
         rendered_width,
         frame_settings,
      } = this.state
      const {splitter_keys, control_block, results_block, on_coverage_data} = this.props
      let top = 0;
      let left = 0;
      if (container_ref.current) {
         const container_bounds = container_ref.current.getBoundingClientRect()
         top = container_bounds.top
         left = container_bounds.left
      }
      const bounding_rect = {
         top,
         left,
         width: rendered_width,
         height: rendered_height,
      }
      const splitter_pos = AppSettings.get(splitter_keys.main_key)
      const right_block_style = {
         left: `${splitter_pos + MARGIN_PX}px`,
         top: `${top + MARGIN_PX}px`,
      }
      const result_block_style = {
         left: `${splitter_pos + MARGIN_PX}px`,
         top: `${top + MARGIN_PX + frame_settings.width_px}px`,
      }
      return [
         <styles.TightCenteredBlock
            ref={container_ref}
            key={'generator-content'}>
            <NavigatorSplitterLayout
               bounding_rect={bounding_rect}
               frame_settings={frame_settings}
               frame_settings_key={splitter_keys.frame_settings_key}
               splitter_keys={splitter_keys}
            />
            <styles.FixedInlineBlock
               style={right_block_style}>
               <FractoTileCoverage
                  bounding_rect={bounding_rect}
                  frame_settings={frame_settings}
                  frame_settings_key={splitter_keys.frame_settings_key}
                  on_level_select={this.on_level_select}
                  on_coverage_data={on_coverage_data}
               />
               <styles.HalfRemSpacer/>
               {control_block}
            </styles.FixedInlineBlock>
         </styles.TightCenteredBlock>,
         <styles.FixedInlineBlock
            style={result_block_style}>
            {results_block}
         </styles.FixedInlineBlock>
      ];
   }
}

export default NavigatorCoverage
