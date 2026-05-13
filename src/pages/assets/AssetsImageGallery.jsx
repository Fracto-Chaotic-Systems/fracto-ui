import React, {Component} from "react";

import {SPLITTER_WIDTH_PX} from "../../constants.jsx";
import CoolSplitter, {
   SPLITTER_TYPE_VERTICAL
} from "../../utils/ui/CoolSplitter.jsx";

import GalleryList, {
   GALLERY_TABLE_WIDTH_PX
} from "./gallery/GalleryList.jsx";
import GalleryLeftPanel from "./gallery/GalleryLeftPanel.jsx";
import GalleryRightPanel from "./gallery/GalleryRightPanel.jsx";

import {
   MainStyles as styles,
   MARGIN_PX,
   TITLE_BAR_HEIGHT_PX
} from '../../styles/MainStyles.jsx'
import AppSettings from "../../AppSettings.jsx";
import {
   KEY_ASSETS_GALLERY_RENDER_SPLITTER_POS,
   KEY_ASSETS_SPLITTER_POS_PX
} from "../../settings/AssetsSettings.jsx";
import AppText from "../../AppText.jsx";
import {KEY_ASSETS_GALLERY} from "../../text/AssetsText.jsx";

const UPDATE_INTERVAL_MS = 1000

export class AssetsImageGallery extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      container_ref: React.createRef(),
      interval: null,
      ready: true,
      asset: null,
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
      const new_values = update_dimensions(rendered_width, rendered_height)
      if (new_values) {
         this.setState(new_values)
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

   render() {
      const {
         asset,
         rendered_height, rendered_width, container_ref, ready, rendered_splitter_pos
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
      container_bounds.height = list_height_px

      const left_panel = asset
         ? <GalleryLeftPanel
            asset={asset}
            ready={ready}
            container_bounds={container_bounds}/>
         : []
      const right_panel = asset
         ? <GalleryRightPanel
            asset={asset}
            rendered_height={rendered_height}
            rendered_width={rendered_width}
         />
         : []
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

export default AssetsImageGallery
