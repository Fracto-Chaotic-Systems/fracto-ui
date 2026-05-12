import React, {Component} from "react";
import styled from "styled-components";

import {
   FRACTO_DATA_PORT,
   FRACTO_UI_PORT
} from "../../../../../constants.js";
import {copy_json} from "../../utils/Dom.jsx";
import NavigatorSplitterLayout from "../../navigator/NavigatorSplitterLayout.jsx";
import FractoColors from "../../utils/render/FractoColors.jsx";

import {MainStyles as styles, MARGIN_PX} from '../../styles/MainStyles.jsx'
import {CoolStyles} from "../../utils/ui/CoolImports.jsx";

import AppSettings from "../../AppSettings.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../../settings/RootSettings.jsx";
import {
   KEY_STUDY_HYPERPLANE_FRAME_SETTINGS,
   KEY_STUDY_HYPERPLANE_LEGEND_SPLITTER_POS,
   KEY_STUDY_HYPERPLANE_SPLITTER_POS,
   KEY_STUDY_HYPERPLANE_STEPS_SPLITTER_POS,
   KEY_STUDY_SPLITTER_POS_PX
} from "../../settings/StudySettings.jsx";
import {KEY_NAVIGATOR_DISABLED} from "../../settings/NavigatorSettings.jsx";

import AppText from "../../AppText.jsx";
import {KEY_STUDY_HYPERPLANE} from "../../text/StudyText.jsx";

const IP_ADDRESS = window.location.host.replace(`:${FRACTO_UI_PORT}`, '')
const UPDATE_INTERVAL_MS = 1000

const CanvasWrapper = styled(CoolStyles.InlineBlock)`
    margin: 1rem;
    border: 2px solid #aaaaaa;
    border-radius: 5px;
    cursor: pointer;
`

export class StudyHyperPlane extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      interval: null,
      container_ref: React.createRef(),
      canvas_ref: React.createRef(),
      frame_settings: null,
      subscription: null,
      rendering_image: false,
   }

   componentDidMount() {
      this.update_dimensions()
      let frame_settings = AppSettings.get(KEY_STUDY_HYPERPLANE_FRAME_SETTINGS)
      frame_settings.hyper_plane = false
      this.setState({
         interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
         frame_settings,
         subscription: AppSettings
            .subscribe(KEY_STUDY_HYPERPLANE_FRAME_SETTINGS, this.on_frame_settings_changed)
      })
      setTimeout(this.clear_canvas, 100)
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

   get_ctx = () => {
      const {canvas_ref} = this.state
      const canvas = canvas_ref.current;
      if (!canvas) {
         console.log('no canvas');
         return;
      }
      return canvas.getContext('2d');
   }

   clear_canvas = () => {
      const ctx = this.get_ctx()
      if (!ctx) {
         console.log('clear_canvas no ctx');
         return;
      }
      const frame_settings = AppSettings.get(
         KEY_STUDY_HYPERPLANE_FRAME_SETTINGS)
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, frame_settings.width_px, frame_settings.width_px);
      ctx.fillStyle = 'black';
      ctx.font = `italic ${16}px Arial`;
      ctx.textAlign = 'center'; // Center text on the x coordinate
      ctx.fillText('click to render',
         frame_settings.width_px / 2,
         frame_settings.width_px / 2);
   }

   get_image_data = async () => {
      const {frame_settings, rendering_image} = this.state
      if (!frame_settings || rendering_image) {
         console.log('no frame_settings or already rendering')
         return
      }
      this.setState({rendering_image: true})
      const all_params = [
         `width=${frame_settings.width_px}`,
         `re=${frame_settings.focal_point.x}`,
         `im=${frame_settings.focal_point.y}`,
         `hn=${0}`,
         `hc=${0}`,
         `scope=${frame_settings.scope}`,
         `abscissa=im`,
         `ordinate=hn`,
      ].join('&')
      const url = `http://${IP_ADDRESS}:${FRACTO_DATA_PORT}/hyper_complex_buffer?${all_params}`
      console.log(`get_image_data calling ${url}`)
      try {
         const response = await fetch(url)
         const result = await response.json()
         console.log(`get_image_data`, result)
         const ctx = this.get_ctx()
         FractoColors.buffer_to_canvas(result.canvas_buffer, ctx)
      } catch (e) {
         console.error('exception thrown in get_image_data', e)
         AppSettings.on_settings_changed({
            [KEY_NAVIGATOR_DISABLED]: false
         })
      }
      this.setState({rendering_image: false})
   }

   on_frame_settings_changed = (key, value) => {
      // console.log('on_frame_settings_changed', value)
      this.setState({frame_settings: value})
   }

   update_dimensions = () => {
      const {rendered_width, rendered_height} = this.state;
      const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS)
      const splitter_width = AppSettings.get(KEY_STUDY_SPLITTER_POS_PX)
      const rendered_width_changed = rendered_width !== viewport_dimensions.width - splitter_width
      const rendered_height_changed = rendered_height !== viewport_dimensions.height
      if (rendered_height_changed || rendered_width_changed) {
         this.setState({
            rendered_width: viewport_dimensions.width - splitter_width,
            rendered_height: viewport_dimensions.height,
         })
      }
   }

   render_image = () => {
      const {canvas_ref, frame_settings} = this.state
      if (!frame_settings) {
         return 'fetching image data'
      }
      return <CanvasWrapper
         onClick={this.get_image_data}>
         <canvas
            key={'hyper-complex-canvas'}
            ref={canvas_ref}
            width={frame_settings.width_px}
            height={frame_settings.width_px}
         />
      </CanvasWrapper>
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
         legend_key: KEY_STUDY_HYPERPLANE_LEGEND_SPLITTER_POS,
         main_key: KEY_STUDY_HYPERPLANE_SPLITTER_POS,
         steps_key: KEY_STUDY_HYPERPLANE_STEPS_SPLITTER_POS,
         section_key: KEY_STUDY_SPLITTER_POS_PX,
      }
      const hyper_frame_settings = copy_json(frame_settings)
      const splitter_pos = AppSettings.get(splitter_keys.main_key)
      const result_block_style = {
         left: `${splitter_pos + MARGIN_PX}px`,
         top: `${top}px`,
      }
      return [
         <styles.SectionTitle
            key={'study-overview-title'}>
            {AppText.get(KEY_STUDY_HYPERPLANE)}
         </styles.SectionTitle>,
         <styles.TightCenteredBlock
            ref={container_ref}
            key={'generator-content'}>
            <NavigatorSplitterLayout
               bounding_rect={bounding_rect}
               frame_settings={hyper_frame_settings}
               frame_settings_key={KEY_STUDY_HYPERPLANE_FRAME_SETTINGS}
               splitter_keys={splitter_keys}
            />
         </styles.TightCenteredBlock>,
         <styles.FixedInlineBlock
            style={result_block_style}>
            {this.render_image()}
         </styles.FixedInlineBlock>
      ];
   }
}

export default StudyHyperPlane
