import React, {Component} from "react";

import CoolSelect from "../../utils/ui/CoolSelect.jsx";

import {
   MainStyles as styles,
   MARGIN_PX
} from '../../styles/MainStyles.jsx'
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";

import AppSettings from "../../AppSettings.jsx";
import {
   KEY_ASSETS_GENERATOR_FRAME_SETTINGS,
   KEY_ASSETS_GENERATOR_RESOLUTION,
   KEY_ASSETS_GENERATOR_SPLITTER_POS,
   KEY_ASSETS_SPLITTER_POS_PX
} from "../../settings/AssetsSettings.jsx";
import AppText from "../../AppText.jsx";
import {
   KEY_IMAGE_ASSETS_ADD_TO_GALLERY,
   KEY_IMAGE_ASSETS_GENERATE,
   KEY_IMAGE_ASSETS_RENDER_NOW,
} from "../../text/AssetsText.jsx";

import {AssetsBackend} from "../../backend/AssetsBackend.jsx";
import NavigatorCoverage from "../../navigator/NavigatorCoverage.jsx";
import {ASSETS_GENERATOR_SPLITTER_KEYS} from "../../navigator/NavigatorKeys.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../../settings/RootSettings.jsx";
import {
   CELL_ALIGN_CENTER,
   CELL_ALIGN_RIGHT,
   CELL_TYPE_NUMBER, CELL_TYPE_TEXT,
   CELL_TYPE_TEXT_KEY
} from "../../utils/ui/styles/CoolTableStyles.jsx";
import CoolTable from "../../utils/ui/CoolTable.jsx";

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

const UPDATE_INTERVAL_MS = 1000
const TABLE_COLUMNS = [
   {
      id: "level",
      label: "level",
      type: CELL_TYPE_NUMBER,
      width_px: 35,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "tile_count",
      label: "tile count",
      type: CELL_TYPE_NUMBER,
      width_px: 80,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "percent",
      label: "percent",
      type: CELL_TYPE_TEXT,
      width_px: 80,
      align: CELL_ALIGN_CENTER,
   },
]

export class AssetsGenerator extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      frame_settings: {},
      resolution: 0,
      image_outcome: null,
      insert_outcome: null,
      coverage_data: null,
      heat_map_buffer: null,
   }

   componentDidMount() {
      this.setState({
         frame_settings: AppSettings
            .get(KEY_ASSETS_GENERATOR_FRAME_SETTINGS),
         interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
         resolution: AppSettings.get(KEY_ASSETS_GENERATOR_RESOLUTION),
      })
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

   change_resolution = (e) => {
      console.log('change_resolution', e.target.value)
      const resolution = parseInt(e.target.value)
      this.setState({resolution})
      AppSettings.on_settings_changed({
         [KEY_ASSETS_GENERATOR_RESOLUTION]: resolution,
      })
   }

   render_image = async () => {
      const {frame_settings, resolution} = this.state
      this.setState({
         image_outcome: null,
         insert_outcome: null,
         in_fetch: true
      })
      const image_outcome = await AssetsBackend.render_image(frame_settings, resolution)
      this.setState({
         image_outcome,
         in_fetch: false
      })
   }

   add_to_gallery = async () => {
      const {image_outcome} = this.state
      if (!image_outcome) {
         return
      }
      const insert_outcome = await AssetsBackend.add_to_gallery(image_outcome)
      this.setState({
         insert_outcome,
         in_fetch: false
      })
   }

   get_proportions = () => {
      const {heat_map_buffer} = this.state
      const result = new Array(50).fill(0)
      for (let col = 0; col < heat_map_buffer.length; col++) {
         for (let row = 0; row < heat_map_buffer[col].length; row++) {
            const level = heat_map_buffer[col][row][1]
            result[level]++
         }
      }
      const total_points = heat_map_buffer.length * heat_map_buffer.length
      return result
         .map((count, level) => {
            return {
               level: level,
               percent: Math.round(count * 10000 / total_points) / 100,
            }
         })
         .filter(item => item.percent > 0)
   }

   render_coverage_table = () => {
      const {coverage_data} = this.state
      if (!coverage_data) {
         return []
      }
      const proportions = this.get_proportions()
      console.log('proportions', proportions)
      const table_data = coverage_data
         .filter(item => item.tiles?.length > 1)
         .map((item, index) => {
            const pro = proportions.find(pro => item.level === pro.level)
            return {
               level: item.level,
               tile_count: item.tiles.length,
               percent: pro ? `${pro.percent}%` : '-'
            }
         })
      return <CoolTable
         columns={TABLE_COLUMNS}
         data={table_data}
      />
   }

   render_button_block = () => {
      const {image_outcome, insert_outcome, resolution, coverage_data} = this.state
      if (!coverage_data) {
         return []
      }
      const resolution_select =
         <CoolSelect
            options={RESOLUTIONS}
            value={resolution}
            on_change={this.change_resolution}
         />
      const render_now_button = <CoolStyles.Block
         onClick={this.render_image}
         key={'resolution-select'}>
         <styles.BlueButton
            key={'blue-button'}>
            {AppText.get(KEY_IMAGE_ASSETS_RENDER_NOW)}
         </styles.BlueButton>
      </CoolStyles.Block>
      const add_to_gallery_button = image_outcome && !insert_outcome
         ? <CoolStyles.Block
            onClick={this.add_to_gallery}
            key={'add-to-gallery'}>
            <styles.BlueButton
               key={'blue-button'}>
               {AppText.get(KEY_IMAGE_ASSETS_ADD_TO_GALLERY)}
            </styles.BlueButton>
         </CoolStyles.Block>
         : []
      const coverage_table = this.render_coverage_table()
      return <CoolStyles.InlineBlock>
         {coverage_table}
         <styles.HalfRemDown/>
         {resolution_select}
         <styles.HalfRemDown/>
         {render_now_button}
         <styles.HalfRemDown/>
         {add_to_gallery_button}
      </CoolStyles.InlineBlock>
   }

   on_coverage_data = (coverage_data, heat_map_buffer) => {
      console.log('coverage_data, heat_map_buffer',
         coverage_data, heat_map_buffer)
      this.setState({
         coverage_data,
         heat_map_buffer,
      })
   }

   render() {
      const {
         rendered_height,
         rendered_width,
         frame_settings,
         image_outcome,
      } = this.state
      let top = 0;
      const splitter_pos = AppSettings.get(KEY_ASSETS_GENERATOR_SPLITTER_POS)
      const leftmost_splitter_pos = AppSettings.get(KEY_ASSETS_SPLITTER_POS_PX)
      const image_style = {
         width: `${rendered_width - splitter_pos + leftmost_splitter_pos - 2 * MARGIN_PX}px`,
         height: `${rendered_height - frame_settings.width_px - top - 2 * MARGIN_PX}px`,
         overflow: "scroll",
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
         <NavigatorCoverage
            splitter_keys={ASSETS_GENERATOR_SPLITTER_KEYS}
            control_block={this.render_button_block()}
            results_block={image}
            on_coverage_data={this.on_coverage_data}
         />
      ];
   }
}

export default AssetsGenerator
