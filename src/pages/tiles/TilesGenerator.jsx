import React, {Component} from "react";

import {
   MainStyles as styles,
   MARGIN_PX
} from '../../styles/MainStyles.jsx'
import AppSettings from "../../AppSettings.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../../settings/RootSettings.jsx";
import {
   KEY_TILES_GENERATOR_FRAME_SETTINGS,
   KEY_TILES_GENERATOR_LEGEND_SPLITTER_POS,
   KEY_TILES_GENERATOR_SPLITTER_POS,
   KEY_TILES_GENERATOR_STEPS_SPLITTER_POS,
   KEY_TILES_SPLITTER_POS_PX
} from "../../settings/TilesSettings.jsx";
import AppText from "../../AppText.jsx";
import {KEY_TILES_GENERATE} from "../../text/TilesText.jsx";

import NavigatorSplitterLayout from "../../navigator/NavigatorSplitterLayout.jsx";
import FractoTileCoverage, {
   INCLUDE_CAN_DO
} from "../../utils/render/FractoTileCoverage.jsx";

const UPDATE_INTERVAL_MS = 1000

export class TilesGenerator extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      interval: null,
      container_ref: React.createRef(),
      bounding_rect: {},
      frame_settings: {},
      subscription: null,
   }

   componentDidMount() {
      const frame_settings = AppSettings
         .get(KEY_TILES_GENERATOR_FRAME_SETTINGS)
      this.update_dimensions()
      this.setState({
         interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
         frame_settings,
         subscription: AppSettings
            .subscribe(KEY_TILES_GENERATOR_FRAME_SETTINGS, this.on_frame_settings_changed)
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

   on_frame_settings_changed = (key, value) => {
      const frame_settings = AppSettings
         .get(KEY_TILES_GENERATOR_FRAME_SETTINGS)
      this.setState({frame_settings})
   }

   update_dimensions = () => {
      const {rendered_width, rendered_height} = this.state;
      const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS)
      const splitter_width = AppSettings.get(KEY_TILES_SPLITTER_POS_PX)
      const rendered_width_changed = rendered_width !== viewport_dimensions.width - splitter_width
      const rendered_height_changed = rendered_height !== viewport_dimensions.height
      if (rendered_height_changed || rendered_width_changed) {
         this.setState({
            rendered_width: viewport_dimensions.width - splitter_width,
            rendered_height: viewport_dimensions.height,
         })
      }
   }

   on_level_select = (level) => {
      // console.log('on_level_select', level)
   }

   render() {
      const {container_ref, rendered_height, rendered_width, frame_settings} = this.state
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
      const splitter_keys = {
         legend_key: KEY_TILES_GENERATOR_LEGEND_SPLITTER_POS,
         main_key: KEY_TILES_GENERATOR_SPLITTER_POS,
         steps_key: KEY_TILES_GENERATOR_STEPS_SPLITTER_POS,
         section_key: KEY_TILES_SPLITTER_POS_PX,
      }
      const tiles_splitter_pos = AppSettings.get(KEY_TILES_SPLITTER_POS_PX)
      const splitter_pos = AppSettings.get(KEY_TILES_GENERATOR_SPLITTER_POS)
      const right_block_style = {
         left: `${splitter_pos + MARGIN_PX}px`,
         top: `${top + MARGIN_PX}px`,
      }
      const tile_coverage_bounds = {
         top,
         left: tiles_splitter_pos + splitter_pos - frame_settings.width_px + MARGIN_PX,
         width: rendered_width - splitter_pos - MARGIN_PX,
         height: rendered_height,
      }
      return [
         <styles.SectionTitle
            key={'tiles-overview-title'}>
            {AppText.get(KEY_TILES_GENERATE)}
         </styles.SectionTitle>,
         <styles.TightCenteredBlock
            ref={container_ref}
            key={'generator-content'}>
            <NavigatorSplitterLayout
               bounding_rect={bounding_rect}
               frame_settings={frame_settings}
               frame_settings_key={KEY_TILES_GENERATOR_FRAME_SETTINGS}
               splitter_keys={splitter_keys}
            />
            <styles.FixedInlineBlock
               style={right_block_style}>
               <FractoTileCoverage
                  bounding_rect={tile_coverage_bounds}
                  frame_settings={frame_settings}
                  frame_settings_key={KEY_TILES_GENERATOR_FRAME_SETTINGS}
                  on_level_select={this.on_level_select}
                  options={[INCLUDE_CAN_DO]}
               />
            </styles.FixedInlineBlock>
         </styles.TightCenteredBlock>,
      ];
   }
}

export default TilesGenerator
