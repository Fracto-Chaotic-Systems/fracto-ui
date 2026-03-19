import React, {Component} from "react";

import {
   MainStyles as styles,
   MARGIN_PX
} from '../../styles/MainStyles.jsx'
import AppSettings from "../../AppSettings.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../../settings/RootSettings.jsx";
import {
   KEY_ASSETS_GENERATOR_FRAME_SETTINGS,
   KEY_ASSETS_GENERATOR_LEGEND_SPLITTER_POS,
   KEY_ASSETS_GENERATOR_SPLITTER_POS,
   KEY_ASSETS_GENERATOR_STEPS_SPLITTER_POS,
   KEY_ASSETS_SPLITTER_POS_PX
} from "../../settings/AssetsSettings.jsx";
import AppText from "../../AppText.jsx";
import {KEY_IMAGE_ASSETS_GENERATE} from "../../text/AssetsText.jsx";

import NavigatorSplitterLayout from "../../navigator/NavigatorSplitterLayout.jsx";
import FractoTileCoverage from "../../utils/render/FractoTileCoverage.jsx";

const UPDATE_INTERVAL_MS = 1000

export class AssetsGenerator extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      interval: null,
      container_ref: React.createRef(),
      frame_settings: {},
      subscription: null,
   }

   componentDidMount() {
      const frame_settings = AppSettings
         .get(KEY_ASSETS_GENERATOR_FRAME_SETTINGS)
      this.setState({
         frame_settings,
         interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
         subscription: AppSettings
            .subscribe(KEY_ASSETS_GENERATOR_FRAME_SETTINGS, this.on_frame_settings_changed)
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
      const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS)
      // console.log('viewport_dimensions', viewport_dimensions)
      const splitter_width = AppSettings.get(KEY_ASSETS_SPLITTER_POS_PX)
      this.setState({
         rendered_width: viewport_dimensions.width - splitter_width,
         rendered_height: viewport_dimensions.height,
      })
   }

   render() {
      const {
         container_ref, rendered_height, rendered_width, frame_settings
      } = this.state
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
         legend_key: KEY_ASSETS_GENERATOR_LEGEND_SPLITTER_POS,
         main_key: KEY_ASSETS_GENERATOR_SPLITTER_POS,
         steps_key: KEY_ASSETS_GENERATOR_STEPS_SPLITTER_POS,
         section_key: KEY_ASSETS_SPLITTER_POS_PX,
      }
      const splitter_pos = AppSettings.get(KEY_ASSETS_GENERATOR_SPLITTER_POS)
      const right_block_style = {
         left: `${splitter_pos + MARGIN_PX}px`,
         top: `${top + MARGIN_PX}px`,
      }
      return [
         <styles.SectionTitle
            key={'assets-overview-title'}>
            {AppText.get(KEY_IMAGE_ASSETS_GENERATE)}
         </styles.SectionTitle>,
         <styles.TightCenteredBlock
            ref={container_ref}
            key={'generator-content'}>
            <NavigatorSplitterLayout
               bounding_rect={bounding_rect}
               frame_settings={frame_settings}
               frame_settings_key={KEY_ASSETS_GENERATOR_FRAME_SETTINGS}
               splitter_keys={splitter_keys}
            />
            <styles.FixedInlineBlock
               style={right_block_style}>
               <FractoTileCoverage
                  bounding_rect={bounding_rect}
                  frame_settings={frame_settings}
                  frame_settings_key={KEY_ASSETS_GENERATOR_FRAME_SETTINGS}
               />
            </styles.FixedInlineBlock>
         </styles.TightCenteredBlock>,
      ];
   }
}

export default AssetsGenerator
