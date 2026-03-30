import React, {Component} from "react";

import {
   MainStyles as styles,
   MARGIN_PX,
   TITLE_BAR_HEIGHT_PX
} from '../../styles/MainStyles.jsx'
import AppSettings from "../../AppSettings.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../../settings/RootSettings.jsx";
import AppText from "../../AppText.jsx";
import {KEY_ASSETS_GALLERY} from "../../text/AssetsText.jsx";
import GalleryList, {GALLERY_TABLE_WIDTH_PX} from "./gallery/GalleryList.jsx";
import CoolSplitter, {SPLITTER_TYPE_VERTICAL} from "../../utils/ui/CoolSplitter.jsx";
import {SPLITTER_WIDTH_PX} from "../../constants.jsx";
import {
   KEY_ASSETS_GALLERY_RENDER_SPLITTER_POS,
   KEY_ASSETS_SPLITTER_POS_PX
} from "../../settings/AssetsSettings.jsx";
import FractoRasterImage from "../../utils/render/FractoRasterImage.jsx";

const UPDATE_INTERVAL_MS = 1000
const IMAGE_SIZE_DELTA = 50

export class AssetsGallery extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      container_ref: React.createRef(),
      interval: null,
      ready: true,
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

   on_ready = () => {
      this.setState({ready: true})
   }

   left_panel = () => {
      const {
         ready,
         core_point,
         container_ref,
         rendered_splitter_pos,
         asset,
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
            the other one
         </div>
      </styles.FixedInlineBlock>
   }

   right_panel = () => {
      return 'right_panel'
   }

   render() {
      const {
         asset,
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
         </div>
      ];
   }
}

export default AssetsGallery

