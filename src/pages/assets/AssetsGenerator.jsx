import React, {Component} from "react";

import CoolSelect from "../../utils/ui/CoolSelect.jsx";

import {
   MainStyles as styles,
   MARGIN_PX
} from '../../styles/MainStyles.jsx'
import AppSettings from "../../AppSettings.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../../settings/RootSettings.jsx";
import {
   KEY_ASSETS_GENERATOR_FRAME_SETTINGS,
   KEY_ASSETS_GENERATOR_LEGEND_SPLITTER_POS,
   KEY_ASSETS_GENERATOR_RESOLUTION,
   KEY_ASSETS_GENERATOR_SPLITTER_POS,
   KEY_ASSETS_GENERATOR_STEPS_SPLITTER_POS,
   KEY_ASSETS_SPLITTER_POS_PX
} from "../../settings/AssetsSettings.jsx";
import AppText from "../../AppText.jsx";
import {
   KEY_IMAGE_ASSETS_GENERATE, KEY_IMAGE_ASSETS_RENDER_NOW,
} from "../../text/AssetsText.jsx";

import NavigatorSplitterLayout from "../../navigator/NavigatorSplitterLayout.jsx";
import FractoTileCoverage from "../../utils/render/FractoTileCoverage.jsx";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";
import {FRACTO_ASSET_PORT, FRACTO_TILES_PORT, FRACTO_UI_PORT} from "../../../../../constants.js";

const UPDATE_INTERVAL_MS = 1000

const RESOLUTIONS = [
   {label: '150', value: 150, help: 'thumbnail',},
   {label: '300', value: 300, help: 'tiny',},
   {label: '600', value: 600, help: 'small',},
   {label: '1200', value: 1200, help: 'medium',},
   {label: '1800', value: 1800, help: 'large',},
   {label: '2400', value: 2400, help: 'super',},
   {label: '3200', value: 3200, help: 'way big',},
   {label: '3600', value: 3600, help: 'bigger still',},
   {label: '4800', value: 4800, help: 'biggliest!',},
]

export class AssetsGenerator extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      interval: null,
      container_ref: React.createRef(),
      frame_settings: {},
      subscription: null,
      resolution: 0,
      selected_level: 0,
      image_outcome: null,
   }

   componentDidMount() {
      const frame_settings = AppSettings
         .get(KEY_ASSETS_GENERATOR_FRAME_SETTINGS)
      this.setState({
         resolution: AppSettings.get[KEY_ASSETS_GENERATOR_RESOLUTION],
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
      const {rendered_width, rendered_height} = this.state;
      const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS)
      const splitter_width = AppSettings.get(KEY_ASSETS_SPLITTER_POS_PX)
      const rendered_width_changed = rendered_width !== viewport_dimensions.width - splitter_width
      const rendered_height_changed = rendered_height !== viewport_dimensions.height
      if (rendered_height_changed || rendered_width_changed) {
         this.setState({
            rendered_width: viewport_dimensions.width - splitter_width,
            rendered_height: viewport_dimensions.height,
         })
      }
   }

   on_level_select = (selected_level) => {
      const resolution = AppSettings.get(KEY_ASSETS_GENERATOR_RESOLUTION)
      this.setState({selected_level, resolution})
   }

   change_resolution = (e) => {
      console.log('change_resolution', e.target.value)
      const resolution = parseInt(e.target.value)
      this.setState({resolution})
      AppSettings.on_settings_changed({
         [KEY_ASSETS_GENERATOR_RESOLUTION]: resolution,
      })
   }

   render_image = async () => {
      const {frame_settings, resolution, selected_level} = this.state
      const all_params = [
         `width_px=${resolution}`,
         `highest_level=${selected_level}`,
         `focal_point_x=${frame_settings.focal_point.x}`,
         `focal_point_y=${frame_settings.focal_point.y}`,
         `scope=${frame_settings.scope}`,
         `resolution_factor=${2.0}`,
         `aspect_ratio=${1}`,
      ].join('&')
      this.setState({image_outcome: null, in_fetch: true})
      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_ASSET_PORT}`)
      const url = `${origin}/render_image?${all_params}`
      try {
         const image_outcome = await fetch(url, {}).then(res => res.json())
         console.log('image_outcome', image_outcome)
         this.setState({image_outcome, in_fetch: false})
      } catch (e) {
         console.error(`error fetching ${url}`, e.message)
      }
   }

   render_button_block = (resolution) => {
      const {selected_level} = this.state
      if (!selected_level) {
         return []
      }
      const resolution_select =
         <CoolSelect
            options={RESOLUTIONS}
            value={resolution}
            on_change={this.change_resolution}
         />
      const blue_button = <CoolStyles.Block
         onClick={this.render_image}
         key={'resolution-select'}>
         <styles.BlueButton
            key={'blue-button'}>
            {AppText.get(KEY_IMAGE_ASSETS_RENDER_NOW)}
         </styles.BlueButton>
      </CoolStyles.Block>
      return <CoolStyles.InlineBlock>
         {resolution_select}
         <styles.HalfRemDown/>
         {blue_button}
      </CoolStyles.InlineBlock>
   }

   render() {
      const {
         container_ref,
         rendered_height,
         rendered_width,
         frame_settings,
         resolution,
         image_outcome,
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
      const image_style = {
         left: `${splitter_pos + MARGIN_PX}px`,
         top: `${top + 2 * MARGIN_PX + frame_settings.width_px}px`,
      }
      const image = image_outcome?.public_url
         ? <styles.FixedInlineBlock
            key={'rendered-image'}
            style={image_style}>
            <img
               onClick={e =>
                  window.open(image_outcome.public_url, '_blank', 'noopener,noreferrer')
               }
               style={{cursor: 'pointer'}}
               src={image_outcome.public_url}
               alt={'copyright 2026 Fracto Inc'}
            />
         </styles.FixedInlineBlock>
         : []
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
                  on_level_select={this.on_level_select}
               />
               <styles.OneRemSpacer/>
               {this.render_button_block(resolution)}
            </styles.FixedInlineBlock>
         </styles.TightCenteredBlock>,
         image
      ];
   }
}

export default AssetsGenerator
