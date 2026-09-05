import React, {Component} from "react";
import PropTypes from "prop-types";

import {MainStyles as styles} from '../../../styles/MainStyles.jsx'
import {BACKGROUND_FIELD_GRADIENT} from '../../../constants.jsx';
import AppText from "../../../AppText.jsx";
import AppSettings from "../../../AppSettings.jsx";
import {render_coordinates, render_scalar} from "../../../utils/Dom.jsx";
import {KEY_NAVIGATOR_FOCAL_POINT, KEY_NAVIGATOR_SCOPE} from "../../../text/NavigatorText.jsx";
import {
   KEY_TILES_TEST_ANIMATION_FRAME_RATE,
   KEY_TILES_TEST_ANIMATION_IMAGE_SIZE,
   KEY_TILES_TEST_ANIMATION_FRAME_COUNTER,
   KEY_TILES_TEST_ANIMATION_FRAME_INDEX,
   KEY_TILES_TEST_ANIMATION_LOAD,
   KEY_TILES_TEST_ANIMATION_LOADING,
   KEY_TILES_TEST_ANIMATION_CUSTOM,
} from "../../../text/TilesText.jsx";
import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import FractoRasterImage from "../../../utils/render/FractoRasterImage.jsx";
import {draw_loading_canvas} from "../../../utils/render/CanvasUtils.jsx";
import DataBackend from "../../../backend/DataBackend.jsx";
import CoolMediaTransport, {
   TRANSPORT_BEGIN,
   TRANSPORT_END,
   TRANSPORT_PAUSE,
   TRANSPORT_PLAY,
   TRANSPORT_REVERSE,
} from "../../../utils/ui/CoolMediaTransport.jsx";
import {
   CELL_ALIGN_LEFT,
   CELL_ALIGN_RIGHT,
   CELL_TYPE_CALLBACK,
   TABLE_NO_BORDER,
   TABLE_NO_HEADER,
   CELL_LABEL_STYLE,
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import {SETTING_LABEL_STYLE} from "../../../utils/ui/styles/CoolStyles.jsx";
import {
   KEY_TILES_TEST_ANIMATION_FRAME_RATE_FPS,
   KEY_TILES_TEST_ANIMATION_IMAGE_SIZE_PX,
   KEY_TILES_TEST_ANIMATION_FRAME_COUNT,
} from "../../../settings/TilesSettings.jsx";
const CUSTOM_OPTION = 'custom'

const FRAME_RATE_OPTIONS_FPS = [40, 30, 25, 20, 15, 12, 10]
const IMAGE_SIZE_OPTIONS_PX = [256, 384, 512, 640, 768, 896, 1024]
const FRAME_COUNT_OPTIONS = [100, 150, 200, 250, 300, 350, 400, 450, 500]
const SCROLLBAR_WIDTH_PX = 22
const IMAGE_FRAME_STYLE = {
   border: '1.5px solid #444444',
   borderRadius: '4px',
   boxShadow: '0.25rem 0.25rem 0.5rem rgba(0, 0, 0, 0.2)',
   overflow: 'hidden',
}
const ANIMATION_STATS_COLUMNS = [
   {id: 'name', label: 'name', type: CELL_TYPE_CALLBACK, align: CELL_ALIGN_RIGHT, style: CELL_LABEL_STYLE},
   {id: 'value', label: 'value', type: CELL_TYPE_CALLBACK, align: CELL_ALIGN_LEFT},
]
/** Formats a frame rate as FPS and milliseconds per frame. */
const format_frame_rate = frames_per_second => {
   const milliseconds_per_frame = (1000 / frames_per_second).toFixed(1).replace(/\.0$/, '')
   return `${frames_per_second} fps (${milliseconds_per_frame} ms/frame)`
}
/** Formats the square image pixel count using K/M notation. */
const format_pixel_count = image_size_px => {
   const pixel_count = image_size_px * image_size_px
   if (pixel_count >= 1000000) return `${(pixel_count / 1000000).toFixed(2).replace(/\.00$/, '')}M px`
   return `${(pixel_count / 1000).toFixed(1).replace(/\.0$/, '')}K px`
}

/**
 * Self-contained animation test tab. Animation state, controls, rendering,
 * timers, and automation-specific helpers belong to this component; the
 * parent supplies only the already-adjusted available dimensions.
 */
export class TestAnimation extends Component {
   static propTypes = {
      width_px: PropTypes.number.isRequired,
      height_px: PropTypes.number.isRequired,
   }
   
   state = {
      animation_frame_rate_fps: AppSettings.get(KEY_TILES_TEST_ANIMATION_FRAME_RATE_FPS),
      animation_image_size_px: AppSettings.get(KEY_TILES_TEST_ANIMATION_IMAGE_SIZE_PX),
      animation_frame_count: AppSettings.get(KEY_TILES_TEST_ANIMATION_FRAME_COUNT),
      animation_frame_count_custom: false,
      animation_playing: false,
      animation_direction: 1,
      animation_frame_index: 0,
      animation_timer: null,
      animation_frame_settings: null,
      animation_frame_rate_custom: false,
      animation_image_size_custom: false,
   }
   
   /** Loads the initial animation starting point after mounting. */
   componentDidMount() {
      this.load_test()
   }
   
   /** Releases the playback interval when leaving the tab. */
   componentWillUnmount() {
      if (this.state.animation_timer) clearInterval(this.state.animation_timer)
      this.unmounted = true
   }
   
   // Match the benchmark sampler: merge the three bailiwick categories,
   // sort by descending magnitude, then choose one random record in 500-1000.
   /** Selects a random benchmark-compatible starting point. */
   load_test = () => {
      this.clear_animation_timer()
      this.setState({animation_playing: false})
      const categories = [
         {is_node: 0, is_inline: 0},
         {is_node: 0, is_inline: 1},
         {is_node: 1, is_inline: 0},
      ]
      const requests = categories.map(params => new Promise((resolve, reject) => {
         try {
            DataBackend.get_minibrots(params, resolve)
         } catch (error) {
            reject(error)
         }
      }))
      Promise.all(requests).then(results => {
         const records = results.flat()
            .filter(record => record && Number.isFinite(Number(record.magnitude)))
            .sort((left, right) => Number(right.magnitude) - Number(left.magnitude))
         const candidates = records.slice(500, 1001)
         if (!candidates.length) throw new Error('No benchmark starting points available')
         const record = candidates[Math.floor(Math.random() * candidates.length)]
         const display_settings = typeof record.display_settings === 'string'
            ? JSON.parse(record.display_settings) : record.display_settings
         const focal_point = display_settings?.focal_point
         const scope = Number(display_settings?.scope)
         if (!focal_point || !Number.isFinite(Number(focal_point.x)) || !Number.isFinite(Number(focal_point.y)) || !Number.isFinite(scope) || scope <= 0) {
            throw new Error('Selected starting point has invalid display settings')
         }
         if (!this.unmounted) this.setState({
            animation_frame_settings: {
               focal_point: {x: Number(focal_point.x), y: Number(focal_point.y)},
               scope,
            },
            animation_frame_index: 0,
         })
      }).catch(error => {
         console.error('animation test load error', error)
      })
   }
   
   /** Calculates the harmonic zoom scope for a frame index. */
   get_animation_scope = frame_index => {
      const {animation_frame_settings, animation_frame_count} = this.state
      if (!animation_frame_settings) return 0
      const intervals = Math.max(1, animation_frame_count - 1)
      const final_scope = Math.max(2.5, animation_frame_settings.scope)
      const factor = (final_scope / animation_frame_settings.scope) ** (1 / intervals)
      return animation_frame_settings.scope * factor ** frame_index
   }
   
   /** Advances one frame and stops at either animation boundary. */
   advance_animation = () => {
      const {animation_direction, animation_frame_count, animation_frame_index} = this.state
      const next_index = animation_frame_index + animation_direction
      if (next_index < 0 || next_index >= animation_frame_count) {
         this.clear_animation_timer()
         this.setState({animation_playing: false})
         return
      }
      this.setState({animation_frame_index: next_index})
   }
   
   // The transport is intentionally state-only for now; frame generation will
   // consume these operations once the animation pipeline is connected.
   /** Dispatches a transport operation to the corresponding animation action. */
   on_animation_operation = operation => {
      if (operation === TRANSPORT_PLAY) this.on_animation_play()
      if (operation === TRANSPORT_REVERSE) this.on_animation_reverse()
      if (operation === TRANSPORT_PAUSE) this.on_animation_pause()
      if (operation === TRANSPORT_BEGIN || operation === TRANSPORT_END) this.on_animation_stop()
   }
   
   /** Starts periodic frame advancement in the requested direction. */
   start_animation = direction => {
      if (!this.state.animation_frame_settings) return
      this.clear_animation_timer()
      const frame_rate_fps = Math.max(1, this.state.animation_frame_rate_fps)
      const animation_timer = setInterval(this.advance_animation, 1000 / frame_rate_fps)
      this.setState({animation_direction: direction, animation_playing: true, animation_timer})
   }
   
   /** Starts forward playback. */
   on_animation_play = () => this.start_animation(1)
   
   /** Starts reverse playback. */
   on_animation_reverse = () => this.start_animation(-1)
   
   /** Pauses playback while preserving the current frame. */
   on_animation_pause = () => {
      this.clear_animation_timer()
      this.setState({animation_playing: false})
   }
   
   /** Stops playback and returns to frame zero. */
   on_animation_stop = () => {
      this.clear_animation_timer()
      this.setState({animation_playing: false, animation_frame_index: 0})
   }
   
   /** Clears the active playback interval. */
   clear_animation_timer = () => {
      if (this.state.animation_timer) clearInterval(this.state.animation_timer)
      this.setState({animation_timer: null})
   }
   
   /** Draws the loading state unless playback is already underway. */
   on_animation_loading = (ctx, width_px, height_px) => {
      // During playback, preserve the last completed frame instead of flashing
      // a loading state between frames.
      if (this.state.animation_playing) return
      draw_loading_canvas(ctx, width_px, height_px, AppText.get(KEY_TILES_TEST_ANIMATION_LOADING))
   }
   
   /** Renders controls, canvas, transport, and frame statistics. */
   render() {
      const {
         animation_frame_rate_fps,
         animation_image_size_px,
         animation_frame_count,
         animation_frame_count_custom,
         animation_frame_index,
         animation_frame_settings,
         animation_frame_rate_custom,
         animation_image_size_custom,
      } = this.state
      const {width_px, height_px} = this.props
      /** Creates a handler for a custom numeric animation setting. */
      const update_animation_setting = (key, state_key) => event => {
         const value = Number(event.target.value)
         if (!Number.isFinite(value) || value <= 0) return
         this.setState({[state_key]: value})
         AppSettings.on_settings_changed({[key]: value})
      }
      /** Creates a handler for a standard or custom animation selector. */
      const select_animation_setting = (key, state_key, custom_state_key) => event => {
         if (event.target.value === CUSTOM_OPTION) {
            this.setState({[custom_state_key]: true})
            return
         }
         const value = Number(event.target.value)
         this.setState({[state_key]: value, [custom_state_key]: false})
         AppSettings.on_settings_changed({[key]: value})
      }
      const frame_rate_value = animation_frame_rate_custom || !FRAME_RATE_OPTIONS_FPS.includes(animation_frame_rate_fps)
         ? CUSTOM_OPTION : String(animation_frame_rate_fps)
      const image_size_value = animation_image_size_custom || !IMAGE_SIZE_OPTIONS_PX.includes(animation_image_size_px)
         ? CUSTOM_OPTION : String(animation_image_size_px)
      const frame_count_value = animation_frame_count_custom || !FRAME_COUNT_OPTIONS.includes(animation_frame_count)
         ? CUSTOM_OPTION : String(animation_frame_count)
      const render_stat_label = label_key => <span>{AppText.get(label_key)}:</span>
      
      const animation_image_column_width = Math.max(width_px / 2, animation_image_size_px + SCROLLBAR_WIDTH_PX)
      const animation_stats = [
         {name: [render_stat_label, KEY_TILES_TEST_ANIMATION_FRAME_INDEX], value: animation_frame_index},
         ...(animation_frame_settings ? [
            {
               name: [render_stat_label, KEY_NAVIGATOR_FOCAL_POINT],
               value: [render_coordinates, animation_frame_settings.focal_point]
            },
            {name: [render_stat_label, KEY_NAVIGATOR_SCOPE], value: [render_scalar, animation_frame_settings.scope]},
         ] : []),
      ]
      return <CoolStyles.Block style={{height: `${height_px}px`, position: 'relative', overflow: 'hidden'}}>
         <div style={{height: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '0.5rem'}}>
            <label style={SETTING_LABEL_STYLE}>
               <span style={CELL_LABEL_STYLE}>{AppText.get(KEY_TILES_TEST_ANIMATION_FRAME_RATE)}</span>
               <select
                  value={frame_rate_value}
                  onChange={select_animation_setting(KEY_TILES_TEST_ANIMATION_FRAME_RATE_FPS, 'animation_frame_rate_fps', 'animation_frame_rate_custom')}
                  style={{marginLeft: '0.35rem'}}>
                  {FRAME_RATE_OPTIONS_FPS.map(value => <option key={value}
                                                               value={value}>{format_frame_rate(value)}</option>)}
                  <option value={CUSTOM_OPTION}>{AppText.get(KEY_TILES_TEST_ANIMATION_CUSTOM)}</option>
               </select>
               {frame_rate_value === CUSTOM_OPTION && <input
                  type={'number'} min={'1'} step={'1'} value={animation_frame_rate_fps}
                  onChange={update_animation_setting(KEY_TILES_TEST_ANIMATION_FRAME_RATE_FPS, 'animation_frame_rate_fps')}
                  style={{marginLeft: '0.35rem', width: '5rem'}}
               />}
            </label>
            <label style={SETTING_LABEL_STYLE}>
               <span style={CELL_LABEL_STYLE}>{AppText.get(KEY_TILES_TEST_ANIMATION_IMAGE_SIZE)}</span>
               <select
                  value={image_size_value}
                  onChange={select_animation_setting(KEY_TILES_TEST_ANIMATION_IMAGE_SIZE_PX, 'animation_image_size_px', 'animation_image_size_custom')}
                  style={{marginLeft: '0.35rem'}}>
                  {IMAGE_SIZE_OPTIONS_PX.map(value => <option key={value}
                                                              value={value}>{value} ({format_pixel_count(value)})</option>)}
                  <option value={CUSTOM_OPTION}>{AppText.get(KEY_TILES_TEST_ANIMATION_CUSTOM)}</option>
               </select>
               {image_size_value === CUSTOM_OPTION && <input
                  type={'number'} min={'1'} step={'1'} value={animation_image_size_px}
                  onChange={update_animation_setting(KEY_TILES_TEST_ANIMATION_IMAGE_SIZE_PX, 'animation_image_size_px')}
                  style={{marginLeft: '0.35rem', width: '5rem'}}
               />}
            </label>
            <label style={SETTING_LABEL_STYLE}>
               <span style={CELL_LABEL_STYLE}>{AppText.get(KEY_TILES_TEST_ANIMATION_FRAME_COUNTER)}</span>
               <select
                  value={frame_count_value}
                  onChange={select_animation_setting(KEY_TILES_TEST_ANIMATION_FRAME_COUNT, 'animation_frame_count', 'animation_frame_count_custom')}
                  style={{marginLeft: '0.35rem'}}>
                  {FRAME_COUNT_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}
                  <option value={CUSTOM_OPTION}>{AppText.get(KEY_TILES_TEST_ANIMATION_CUSTOM)}</option>
               </select>
               {frame_count_value === CUSTOM_OPTION && <input
                  type={'number'} min={'1'} step={'1'} value={animation_frame_count}
                  onChange={update_animation_setting(KEY_TILES_TEST_ANIMATION_FRAME_COUNT, 'animation_frame_count')}
                  style={{marginLeft: '0.35rem', width: '5rem'}}
               />}
            </label>
            <styles.BlueButton onClick={this.load_test} style={{marginTop: '0.5rem', marginBottom: '0.5rem'}}>
               {AppText.get(KEY_TILES_TEST_ANIMATION_LOAD)}
            </styles.BlueButton>
         </div>
         <div style={{
            height: 'calc(100% - 2.5rem)',
            display: 'flex',
            minWidth: 0,
            background: BACKGROUND_FIELD_GRADIENT
         }}>
            <div style={{
               flex: `0 0 ${animation_image_column_width}px`,
               minWidth: 0,
               display: 'flex',
               justifyContent: 'flex-start',
               alignItems: 'flex-start',
               overflow: 'auto',
               background: BACKGROUND_FIELD_GRADIENT
            }}>
               {animation_frame_settings ? <div style={{
                  ...IMAGE_FRAME_STYLE,
                  position: 'relative',
                  marginLeft: 'auto',
                  marginRight: '1rem',
                  marginTop: '1rem',
                  flex: '0 0 auto'
               }}><FractoRasterImage
                  width_px={animation_image_size_px}
                  focal_point={animation_frame_settings.focal_point}
                  scope={this.get_animation_scope(animation_frame_index)}
                  aspect_ratio={1.0}
                  on_loading={this.on_animation_loading}
               /></div> : <div style={{
                  ...IMAGE_FRAME_STYLE,
                  marginLeft: 'auto',
                  marginRight: '1rem',
                  marginTop: '1rem',
                  flex: '0 0 auto'
               }}>
                  <canvas
                     width={animation_image_size_px}
                     height={animation_image_size_px}
                     style={{
                        display: 'block',
                        width: `${animation_image_size_px}px`,
                        height: `${animation_image_size_px}px`,
                        flex: '0 0 auto',
                        aspectRatio: '1 / 1',
                        backgroundColor: '#d3d3d3'
                     }}
                  />
               </div>}
            </div>
            <div style={{width: '1px', flex: '0 0 1px', margin: '0 1rem 0 0', backgroundColor: '#aaaaaa'}}/>
            <div style={{flex: '1 1 0', minWidth: 0, overflow: 'auto', backgroundColor: 'white'}}>
               <div style={{marginBottom: '1rem'}}>
                  <CoolMediaTransport
                     width_px={120}
                     on_operation={this.on_animation_operation}
                  />
               </div>
               <CoolTable
                  columns={ANIMATION_STATS_COLUMNS}
                  data={animation_stats}
                  options={[TABLE_NO_HEADER, TABLE_NO_BORDER]}
               />
            </div>
         </div>
      </CoolStyles.Block>
   }
}

export default TestAnimation
