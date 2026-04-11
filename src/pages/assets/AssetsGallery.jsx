import React, {Component} from "react";
import Magnifier from "react-magnifier";

import {
   MainStyles as styles,
   MARGIN_PX,
   TITLE_BAR_HEIGHT_PX
} from '../../styles/MainStyles.jsx'
import AppSettings from "../../AppSettings.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../../settings/RootSettings.jsx";
import AppText from "../../AppText.jsx";
import {
   KEY_ASSETS_GALLERY,
   KEY_COLUMN_LABEL_ASSET_FOCAL_POINT_COLON,
   KEY_COLUMN_LABEL_ASSET_SCOPE_COLON
} from "../../text/AssetsText.jsx";
import GalleryList, {GALLERY_TABLE_WIDTH_PX} from "./gallery/GalleryList.jsx";
import CoolSplitter, {SPLITTER_TYPE_VERTICAL} from "../../utils/ui/CoolSplitter.jsx";
import {SPLITTER_WIDTH_PX} from "../../constants.jsx";
import {
   KEY_ASSETS_GALLERY_RENDER_SPLITTER_POS,
   KEY_ASSETS_SPLITTER_POS_PX
} from "../../settings/AssetsSettings.jsx";
import FractoRasterImage from "../../utils/render/FractoRasterImage.jsx";
import FieldsColorWheel from "../../utils/render/FieldsColorWheel.jsx";
import {
   CELL_ALIGN_LEFT,
   CELL_ALIGN_RIGHT,
   CELL_TYPE_CALLBACK,
   CELL_TYPE_TEXT_KEY,
   TABLE_NO_BORDER,
   TABLE_NO_HEADER
} from "../../utils/ui/styles/CoolTableStyles.jsx";
import {render_coordinates, render_scalar} from "../../utils/Dom.jsx";
import CoolTable from "../../utils/ui/CoolTable.jsx";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";
import {send_to_icon} from "../../utils/ui/CoolIcons.jsx";
import FractoLegend from "../../utils/render/FractoLegend.jsx";

const UPDATE_INTERVAL_MS = 1000
const IMAGE_SIZE_DELTA = 50

const TABLE_COLUMNS = [
   {
      id: "name",
      label: "name",
      type: CELL_TYPE_TEXT_KEY,
      width_px: 35,
      style: {fontWeight: 'bold', color: '#666666', fontStyle: 'italic'},
      align: CELL_ALIGN_RIGHT,
   },
   {
      id: "value",
      label: "value",
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_LEFT,
   },
]

export class AssetsGallery extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      container_ref: React.createRef(),
      interval: null,
      ready: true,
      canvas_buffer: [],
   }

   componentDidMount() {
      this.update_dimensions()
      this.setState({
         rendered_splitter_pos: AppSettings.get(KEY_ASSETS_GALLERY_RENDER_SPLITTER_POS),
         interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
      })
   }

   componentWillUnmount() {
      const {interval} = this.state
      if (interval) {
         clearInterval(interval)
      }
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

   on_select_asset = (asset) => {
      console.log('on_select_asset', asset)
      this.setState({asset})
   }

   change_splitter_pos = (pos) => {
      const {container_ref} = this.state
      if (container_ref.current) {
         const container_bounds = container_ref.current.getBoundingClientRect()
         if (pos < (container_bounds.left + GALLERY_TABLE_WIDTH_PX)) {
            return;
         }
         if (pos > (container_bounds.left + GALLERY_TABLE_WIDTH_PX + container_bounds.height / 2)) {
            return;
         }
      }
      AppSettings.on_settings_changed({
         [KEY_ASSETS_GALLERY_RENDER_SPLITTER_POS]: pos
      })
      this.setState({rendered_splitter_pos: pos})
   }

   on_ready = (canvas_buffer) => {
      this.setState({
         canvas_buffer,
         ready: true,
      })
   }

   left_panel = () => {
      const {
         ready,
         core_point,
         container_ref,
         rendered_splitter_pos,
         asset, canvas_buffer,
      } = this.state
      if (!asset?.scope) {
         return []
      }
      let top = 0;
      let left = 0;
      let container_bounds = {}
      if (container_ref.current) {
         container_bounds = container_ref.current.getBoundingClientRect()
         top = container_bounds.top
         left = container_bounds.left
      }
      const study_splitter_pos = AppSettings.get(KEY_ASSETS_SPLITTER_POS_PX)
      const width =
         rendered_splitter_pos
         - study_splitter_pos
         - GALLERY_TABLE_WIDTH_PX
         - SPLITTER_WIDTH_PX
      const width_px = Math
         .floor(width / IMAGE_SIZE_DELTA) * IMAGE_SIZE_DELTA
      const margin = (width - width_px) / 2
      const panel_style = {
         top: `${top}px`,
         left: `${left + GALLERY_TABLE_WIDTH_PX}px`,
         width: `${width}px`,
         height: `${container_bounds.height}px`,
         backgroundColor: '#e4e4e4',
      }
      const image_style = {
         margin: `${margin}px auto`,
         width: `${width_px}px`,
         height: `${width_px}px`,
         boxShadow: '5px 5px 10px rgba(0, 0, 0, 0.25)',
         backgroundColor: '#f8f8f8',
         cursor: ready ? 'crosshair' : 'wait',
      }
      const asset_focal_point = {
         x: asset.focal_point_x,
         y: asset.focal_point_y,
      }
      return <styles.FixedInlineBlock
         style={panel_style}>
         <div style={image_style}>
            <FractoRasterImage
               width_px={width_px}
               focal_point={asset_focal_point}
               scope={asset.scope}
               on_plan_complete={this.on_ready}
            />
         </div>
         <div style={image_style}>
            <FieldsColorWheel
               width_px={width_px}
               canvas_buffer={canvas_buffer}
            />
         </div>
      </styles.FixedInlineBlock>
   }

   right_panel = () => {
      const {asset, rendered_height, rendered_width, rendered_splitter_pos} = this.state
      if (!asset) {
         return "click an image to start"
      }
      const width = rendered_width - 2 * MARGIN_PX // Math.round(rendered_height * 0.70)
      const upper_block_height = Math.round(rendered_height * 0.20)
      const focal_point = {
         x: asset.focal_point_x,
         y: asset.focal_point_y,
      }
      const table_data = [
         {
            name: KEY_COLUMN_LABEL_ASSET_SCOPE_COLON,
            value: [render_scalar, asset.scope],
         },
         {
            name: KEY_COLUMN_LABEL_ASSET_FOCAL_POINT_COLON,
            value: [render_coordinates, focal_point],
         },
      ]
      const asset_id_style = {
         fontSize: '2.25rem',
         lineHeight: '2rem',
         color: '#777777',
         margin: '0 0.5rem',
         borderBottom: '0.25rem solid #777777',
         textShadow: '2px 2px 4px rgba(0, 0, 0, 0.25)',
      }
      const icon_style = {
         width: `30px`,
         height: `30px`,
         fill: '#cccccc',
         marginLeft: '0.5rem',
      }
      const legend_style = {
         margin: '0.5rem 0 0',
      }
      const splitter_width = AppSettings.get(KEY_ASSETS_SPLITTER_POS_PX)
      const image_width = rendered_width - rendered_splitter_pos + splitter_width
      const magnifier_style = {height: `${rendered_height * 0.70}px`}
      return [
         <styles.ScrollingBlock
            style={{height: `${upper_block_height}px`}}>
            <CoolStyles.Block>
               <styles.NumericValue
                  style={asset_id_style}>
                  {asset.asset_id}
               </styles.NumericValue>
               <styles.HalfRemSpacer/>
               <styles.FixedInlineBlock>
                  <CoolStyles.InlineBlock>
                     <CoolTable
                        columns={TABLE_COLUMNS}
                        data={table_data}
                        options={[TABLE_NO_HEADER, TABLE_NO_BORDER]}
                     />
                  </CoolStyles.InlineBlock>
                  <styles.InlineHover
                     style={icon_style}>
                     {send_to_icon}
                  </styles.InlineHover>
               </styles.FixedInlineBlock>
            </CoolStyles.Block>
            <CoolStyles.Block style={legend_style}>
               <FractoLegend
                  height_px={135}
                  focal_point={focal_point}
               />
            </CoolStyles.Block>
         </styles.ScrollingBlock>,
         <styles.ScrollingBlock style={magnifier_style}>
            <Magnifier
               width={image_width - 2 * MARGIN_PX}
               src={asset.public_url}
               zoomFactor={2.5}
               mgWidth={250}
               mgHeight={250}
            />
         </styles.ScrollingBlock>
      ]
   }

   render() {
      const {
         rendered_height, container_ref, ready, rendered_splitter_pos
      } = this.state
      let top = 0;
      let container_bounds = {}
      if (container_ref.current) {
         container_bounds = container_ref.current.getBoundingClientRect()
         top = container_bounds.top
      }
      const list_height_px = rendered_height - 2 * MARGIN_PX - top + TITLE_BAR_HEIGHT_PX
      const panel_style = {
         height: `${list_height_px}px`,
      }
      const study_splitter_pos = AppSettings.get(KEY_ASSETS_SPLITTER_POS_PX)
      const width = rendered_splitter_pos - study_splitter_pos - GALLERY_TABLE_WIDTH_PX - SPLITTER_WIDTH_PX
      const render_width_px = Math
         .floor(width / IMAGE_SIZE_DELTA) * IMAGE_SIZE_DELTA
      container_bounds.height = list_height_px
      const left_panel = this.left_panel()
      const right_panel = this.right_panel()
      const splitter_pos = AppSettings.get(KEY_ASSETS_GALLERY_RENDER_SPLITTER_POS)
      const right_block_style = {
         left: `${splitter_pos + MARGIN_PX}px`,
         top: `${top + MARGIN_PX}px`,
      }
      return [
         <styles.SectionTitle
            key={'assets-overview-title'}>
            {AppText.get(KEY_ASSETS_GALLERY)}
         </styles.SectionTitle>,
         <div
            style={panel_style}
            ref={container_ref}>
            <GalleryList
               height_px={list_height_px}
               on_select_asset={this.on_select_asset}
               ready={ready}
            />
            {left_panel}
            <CoolSplitter
               type={SPLITTER_TYPE_VERTICAL}
               name={'gallery-main-splitter'}
               bar_width_px={SPLITTER_WIDTH_PX}
               container_bounds={container_bounds}
               position={rendered_splitter_pos}
               on_change={this.change_splitter_pos}
            />
            <styles.FixedInlineBlock
               style={right_block_style}>
               {right_panel}
            </styles.FixedInlineBlock>
         </div>
      ];
   }
}

export default AssetsGallery

