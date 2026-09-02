import React, {Component} from "react";
import {Line} from 'react-chartjs-2';
import {Chart as ChartJS, registerables} from 'chart.js';

import {MainStyles as styles, TITLE_BAR_HEIGHT_PX} from '../../styles/MainStyles.jsx'
import {BACKGROUND_FIELD_GRADIENT} from '../../constants.jsx';
import AppText from "../../AppText.jsx";
import AppSettings from "../../AppSettings.jsx";
import {render_coordinates, render_scalar} from "../../utils/Dom.jsx";
import {KEY_NAVIGATOR_FOCAL_POINT, KEY_NAVIGATOR_SCOPE} from "../../text/NavigatorText.jsx";
import {
   KEY_TILES_TEST_DURATION_MS,
   KEY_TILES_TEST_COMBINE_RESULTS,
   KEY_TILES_TEST_COMBINATION_SIMPLE,
   KEY_TILES_TEST_COMBINATION_SIMPLE_HELP,
   KEY_TILES_TEST_COMBINATION_INTERPOLATED,
   KEY_TILES_TEST_COMBINATION_INTERPOLATED_HELP,
   KEY_TILES_TEST_BENCHMARKS,
   KEY_TILES_TEST_ANIMATION,
   KEY_TILES_TEST_ANIMATION_FRAME_RATE,
   KEY_TILES_TEST_ANIMATION_IMAGE_SIZE,
   KEY_TILES_TEST_ANIMATION_FRAME_COUNT,
   KEY_TILES_TEST_ANIMATION_FRAME_INDEX,
   KEY_TILES_TEST_ANIMATION_LOAD,
   KEY_TILES_TEST_ANIMATION_CUSTOM,
   KEY_TILES_TEST_HARNESS,
   KEY_TILES_TEST_LEGACY_MAX,
   KEY_TILES_TEST_LEGACY_MEDIAN,
   KEY_TILES_TEST_LEGACY_MIN,
   KEY_TILES_TEST_STEP_INDEX,
   KEY_TILES_TEST_TURBO_MAX,
   KEY_TILES_TEST_TURBO_MEDIAN,
   KEY_TILES_TEST_TURBO_MIN,
} from "../../text/TilesText.jsx";
import TilesBackend from "../../backend/TilesBackend.jsx";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";
import CoolTabs from "../../utils/ui/CoolTabs.jsx";
import CoolTable from "../../utils/ui/CoolTable.jsx";
import CoolSelect from "../../utils/ui/CoolSelect.jsx";
import FractoRasterImage from "../../utils/render/FractoRasterImage.jsx";
import DataBackend from "../../backend/DataBackend.jsx";
import CoolMediaTransport, {
   TRANSPORT_BEGIN,
   TRANSPORT_END,
   TRANSPORT_PAUSE,
   TRANSPORT_PLAY,
   TRANSPORT_REVERSE,
} from "../../utils/ui/CoolMediaTransport.jsx";
import {
   CELL_ALIGN_LEFT,
   CELL_ALIGN_RIGHT,
   CELL_TYPE_CALLBACK,
   TABLE_NO_BORDER,
   TABLE_NO_HEADER,
   CELL_LABEL_STYLE,
} from "../../utils/ui/styles/CoolTableStyles.jsx";
import {update_dimensions} from "../PageUtils.jsx";
import {
   KEY_TILES_SPLITTER_POS_PX,
   KEY_TILES_TEST_COMBINE_RESULTS as KEY_TILES_TEST_COMBINE_RESULTS_SETTING,
   KEY_TILES_TEST_COMBINATION_METHOD,
   KEY_TILES_TEST_ANIMATION_FRAME_RATE_FPS,
   KEY_TILES_TEST_ANIMATION_IMAGE_SIZE_PX,
   KEY_TILES_TEST_ANIMATION_FRAME_COUNT as KEY_TILES_TEST_ANIMATION_FRAME_COUNT_SETTING,
   KEY_TILES_TEST_TAB,
} from "../../settings/TilesSettings.jsx";

ChartJS.register(...registerables)

const TAB_HEADER_HEIGHT_PX = 32
const SCROLLBAR_WIDTH_PX = 22
const FRAME_RATE_OPTIONS_FPS = [40, 30, 25, 20, 15, 12, 10]
const IMAGE_SIZE_OPTIONS_PX = [256, 384, 512, 640, 768, 896, 1024]
const FRAME_COUNT_OPTIONS = [100, 150, 200, 250, 300, 350, 400, 450, 500]
const CUSTOM_OPTION = 'custom'
const render_stat_label = label_key => <span>{AppText.get(label_key)}:</span>
const ANIMATION_STATS_COLUMNS = [
   {id: 'name', label: 'name', type: CELL_TYPE_CALLBACK, align: CELL_ALIGN_RIGHT, style: CELL_LABEL_STYLE},
   {id: 'value', label: 'value', type: CELL_TYPE_CALLBACK, align: CELL_ALIGN_LEFT},
]
const format_frame_rate = frames_per_second => {
   const milliseconds_per_frame = (1000 / frames_per_second).toFixed(1).replace(/\.0$/, '')
   return `${frames_per_second} fps (${milliseconds_per_frame} ms/frame)`
}
const format_pixel_count = image_size_px => {
   const pixel_count = image_size_px * image_size_px
   if (pixel_count >= 1000000) return `${(pixel_count / 1000000).toFixed(2).replace(/\.00$/, '')}M px`
   return `${(pixel_count / 1000).toFixed(1).replace(/\.0$/, '')}K px`
}

const METRICS = [
   {key: 'min_ms', color: '#4472c4'},
   {key: 'median_ms', color: '#70ad47'},
   {key: 'max_ms', color: '#ed7d31'},
]
const STRATEGY_COLORS = {
   legacy: ['#7030a0', '#4472c4', '#70ad47'],
   turbo: ['#ffd966', '#ed7d31', '#c00000'],
}
const LEGEND_ENTRIES = [
   {key: 'legacy_min_ms', text_key: KEY_TILES_TEST_LEGACY_MIN, color: STRATEGY_COLORS.legacy[0]},
   {key: 'legacy_median_ms', text_key: KEY_TILES_TEST_LEGACY_MEDIAN, color: STRATEGY_COLORS.legacy[1]},
   {key: 'legacy_max_ms', text_key: KEY_TILES_TEST_LEGACY_MAX, color: STRATEGY_COLORS.legacy[2]},
   {key: 'turbo_min_ms', text_key: KEY_TILES_TEST_TURBO_MIN, color: STRATEGY_COLORS.turbo[0]},
   {key: 'turbo_median_ms', text_key: KEY_TILES_TEST_TURBO_MEDIAN, color: STRATEGY_COLORS.turbo[1]},
   {key: 'turbo_max_ms', text_key: KEY_TILES_TEST_TURBO_MAX, color: STRATEGY_COLORS.turbo[2]},
]

const get_source_key = fixture => {
   const source = fixture.source || {}
   return `${source.category || 'unknown'}-${source.id || 'unknown'}`
}

const get_step = fixture => {
   if (Number.isFinite(fixture.parameters?.step)) return fixture.parameters.step
   const parts = `${fixture.name || ''}`.split('-')
   const fallback = Number(parts[parts.length - 1])
   return Number.isFinite(fallback) ? fallback : null
}

/**
 * Aggregate one step while limiting the influence of rare timing spikes.
 * Percentile bounds, trimming, winsorization, and log-space averaging are
 * intentionally kept here so interpolated mode remains stepwise and jagged.
 */
const robust_step_value = (values, metric_index) => {
   const sorted = [...values].sort((left, right) => left - right)
   if (!sorted.length) return 0.1
   const percentile = fraction => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))]
   if (metric_index === 1) return percentile(0.5)
   const lower = percentile(0.1)
   const upper = percentile(0.95)
   const trim_count = Math.floor(sorted.length * 0.1)
   const trimmed = sorted.slice(trim_count, Math.max(trim_count + 1, sorted.length - trim_count))
   const winsorized = sorted.map(value => Math.min(upper, Math.max(lower, value)))
   const arithmetic_mean = trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length
   const log_mean = Math.exp(winsorized.reduce((sum, value) => sum + Math.log(Math.max(0.1, value)), 0) / winsorized.length)
   const percentile_target = metric_index === 0 ? lower : upper
   return Math.max(0.1, (arithmetic_mean + log_mean + percentile_target) / 3)
}

const build_chart_data = (benchmark_results, combine_results = false, hidden_legend_keys = [], combination_method = 'interpolated') => {
   const datasets = []
   for (const strategy of ['legacy', 'turbo']) {
      const fixtures = benchmark_results?.[strategy]?.report?.fixtures || []
      const sources = new Map()
      fixtures.forEach(fixture => {
         const key = get_source_key(fixture)
         if (!sources.has(key)) sources.set(key, [])
         sources.get(key).push(fixture)
      })
      const source_entries = combine_results
         ? [['combined', [...sources.values()].flat()]]
         : [...sources.entries()]
      for (const [source_key, source_fixtures] of source_entries) {
         source_fixtures.sort((left, right) => (get_step(left) || 0) - (get_step(right) || 0))
         METRICS.forEach((metric, metric_index) => {
            const points = source_fixtures.map(fixture => ({
               x: get_step(fixture),
               y: fixture.summary?.[metric.key],
            })).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
            const step_values = [...new Set(points.map(point => point.x))].sort((left, right) => left - right)
            const grouped_points = new Map()
            points.forEach(point => {
               if (!grouped_points.has(point.x)) grouped_points.set(point.x, [])
               grouped_points.get(point.x).push(point.y)
            })
            datasets.push({
               label: `${strategy} ${source_key} ${metric.key}`,
               legend_key: `${strategy}_${metric.key}`,
               hidden: hidden_legend_keys.includes(`${strategy}_${metric.key}`),
               data: combine_results
                  ? combination_method === 'interpolated'
                     ? step_values.map(x => ({
                        x,
                        y: robust_step_value(grouped_points.get(x), metric_index),
                     }))
                     : [...grouped_points.entries()].map(([x, values]) => ({
                        x,
                        y: values.reduce((sum, value) => sum + value, 0) / values.length,
                     }))
                  : points,
               borderColor: STRATEGY_COLORS[strategy][metric_index],
               backgroundColor: STRATEGY_COLORS[strategy][metric_index],
               borderWidth: metric_index === 1 ? 2.5 : (combine_results ? 1.5 : 0.75),
               pointRadius: 1.5,
               tension: 0.15,
               fill: false,
            })
         })
      }
   }
   return {datasets}
}

const get_chart_minimum = chart_data => {
   const values = chart_data.datasets
      .flatMap(dataset => dataset.data.map(point => point.y))
      .filter(value => Number.isFinite(value) && value > 0)
   if (!values.length) return 1
   return Math.max(0.1, Math.floor(Math.min(...values)) - 1)
}

const chart_options = (step_label, duration_label, minimum, on_toggle_legend) => ({
   responsive: true,
   maintainAspectRatio: false,
   animation: false,
   interaction: {mode: 'nearest', intersect: false},
   plugins: {
      legend: {
         labels: {
            generateLabels: chart => LEGEND_ENTRIES.map(entry => {
               const dataset_indexes = chart.data.datasets
                  .map((dataset, index) => dataset.legend_key === entry.key ? index : -1)
                  .filter(index => index >= 0)
               const hidden = dataset_indexes.length > 0 && dataset_indexes.every(index =>
                  !chart.isDatasetVisible(index))
               return {
                  text: AppText.get(entry.text_key),
                  fillStyle: entry.color,
                  strokeStyle: entry.color,
                  lineWidth: 2,
                  hidden,
                  legend_key: entry.key,
               }
            }),
         },
         onClick: (_, legend_item) => on_toggle_legend(legend_item.legend_key),
      },
   },
   scales: {
      x: {type: 'linear', title: {display: true, text: step_label}, ticks: {precision: 0}},
      y: {
         type: 'logarithmic',
         min: minimum,
         title: {display: true, text: duration_label},
      },
   },
})

export class TilesTest extends Component {
   state = {
      benchmark_results: null,
      benchmark_error: null,
      tab_index: 0,
      animation_frame_rate_fps: AppSettings.get(KEY_TILES_TEST_ANIMATION_FRAME_RATE_FPS),
      animation_image_size_px: AppSettings.get(KEY_TILES_TEST_ANIMATION_IMAGE_SIZE_PX),
      animation_frame_count: AppSettings.get(KEY_TILES_TEST_ANIMATION_FRAME_COUNT_SETTING),
      animation_frame_count_custom: false,
      animation_playing: false,
      animation_frame_settings: null,
      animation_loading: false,
      animation_frame_rate_custom: false,
      animation_image_size_custom: false,
      combine_results: AppSettings.get(KEY_TILES_TEST_COMBINE_RESULTS_SETTING),
      combination_method: AppSettings.get(KEY_TILES_TEST_COMBINATION_METHOD),
      hidden_legend_keys: [],
      rendered_width: 0,
      rendered_height: 0,
      dimensions_interval: null,
      container_ref: React.createRef(),
   }

   componentDidMount() {
      const saved_tab = AppSettings.get(KEY_TILES_TEST_TAB)
      const tab_index = Number.isInteger(saved_tab) && saved_tab >= 0 && saved_tab <= 1 ? saved_tab : 0
      this.setState({tab_index})
      this.update_dimensions()
      this.setState({dimensions_interval: setInterval(this.update_dimensions, 1000)})
      this.load_test()
      TilesBackend.benchmark_results()
         .then(benchmark_results => this.setState({benchmark_results}))
         .catch(benchmark_error => {
            console.error('benchmark results fetch error', benchmark_error)
            this.setState({benchmark_error})
         })
   }

   componentWillUnmount() {
      if (this.state.dimensions_interval) clearInterval(this.state.dimensions_interval)
      this.unmounted = true
   }

   update_dimensions = () => {
      const {rendered_width, rendered_height} = this.state
      const new_values = update_dimensions(rendered_width, rendered_height, KEY_TILES_SPLITTER_POS_PX)
      if (new_values && !this.unmounted) this.setState(new_values)
   }

   toggle_legend = legend_key => {
      this.setState(previous => ({
         hidden_legend_keys: previous.hidden_legend_keys.includes(legend_key)
            ? previous.hidden_legend_keys.filter(key => key !== legend_key)
            : [...previous.hidden_legend_keys, legend_key],
      }))
   }

   on_tab_select = tab_index => {
      this.setState({tab_index})
      AppSettings.on_settings_changed({[KEY_TILES_TEST_TAB]: tab_index})
   }

   on_animation_play = () => this.setState({animation_playing: true})
   on_animation_reverse = () => this.setState({animation_playing: true})
   on_animation_pause = () => this.setState({animation_playing: false})
   on_animation_stop = () => this.setState({animation_playing: false})

   // The transport is intentionally state-only for now; frame generation will
   // consume these operations once the animation pipeline is connected.
   on_animation_operation = operation => {
      if (operation === TRANSPORT_PLAY) this.on_animation_play()
      if (operation === TRANSPORT_REVERSE) this.on_animation_reverse()
      if (operation === TRANSPORT_PAUSE) this.on_animation_pause()
      if (operation === TRANSPORT_BEGIN || operation === TRANSPORT_END) this.on_animation_stop()
   }

   // Match the benchmark sampler: merge the three bailiwick categories,
   // sort by descending magnitude, then choose one random record in 500-1000.
   load_test = () => {
      this.setState({animation_loading: true})
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
            animation_loading: false,
         })
      }).catch(error => {
         console.error('animation test load error', error)
         if (!this.unmounted) this.setState({animation_loading: false})
      })
   }

   render() {
      const {
         benchmark_results, rendered_width, rendered_height, container_ref, combine_results, combination_method, hidden_legend_keys, tab_index,
         animation_frame_rate_fps, animation_image_size_px, animation_frame_count, animation_frame_count_custom,
         animation_frame_rate_custom, animation_image_size_custom,
         animation_frame_settings,
      } = this.state
      const chart_data = benchmark_results && build_chart_data(benchmark_results, combine_results, hidden_legend_keys, combination_method)
      const top = container_ref.current?.getBoundingClientRect().top || TITLE_BAR_HEIGHT_PX
      const available_height = Math.max(0, rendered_height - top)
      const tab_content_height = Math.max(0, available_height - TAB_HEADER_HEIGHT_PX)
      const benchmark_content = <CoolStyles.Block style={{height: `${tab_content_height}px`, position: 'relative', overflow: 'hidden'}}>
         <div style={{height: '2rem', display: 'flex', alignItems: 'center', paddingLeft: '0.5rem'}}>
            <label>
               <input
                  type={'checkbox'}
                  checked={combine_results}
                  onChange={event => {
                     const combine_results = event.target.checked
                     this.setState({combine_results})
                     AppSettings.on_settings_changed({
                        [KEY_TILES_TEST_COMBINE_RESULTS_SETTING]: combine_results,
                     })
                  }}
               />
               <span style={{marginLeft: '0.35rem'}}>
                  {AppText.get(KEY_TILES_TEST_COMBINE_RESULTS)}
               </span>
            </label>
            <CoolSelect
               options={[
                  {value: 'simple', label: AppText.get(KEY_TILES_TEST_COMBINATION_SIMPLE), help: AppText.get(KEY_TILES_TEST_COMBINATION_SIMPLE_HELP)},
                  {value: 'interpolated', label: AppText.get(KEY_TILES_TEST_COMBINATION_INTERPOLATED), help: AppText.get(KEY_TILES_TEST_COMBINATION_INTERPOLATED_HELP)},
               ]}
               value={combination_method}
               on_change={event => {
                  const combination_method = event.target.value
                  this.setState({combination_method})
                  AppSettings.on_settings_changed({[KEY_TILES_TEST_COMBINATION_METHOD]: combination_method})
               }}
               extra_style={{padding: 0}}
            />
         </div>
         <div style={{height: 'calc(100% - 2rem)', position: 'relative'}}>
            {chart_data && <Line
               data={chart_data}
               options={chart_options(
                  AppText.get(KEY_TILES_TEST_STEP_INDEX),
                  AppText.get(KEY_TILES_TEST_DURATION_MS),
                  get_chart_minimum(chart_data),
                  this.toggle_legend)}
            />}
         </div>
      </CoolStyles.Block>
      const update_animation_setting = (key, state_key) => event => {
         const value = Number(event.target.value)
         if (!Number.isFinite(value) || value <= 0) return
         this.setState({[state_key]: value})
         AppSettings.on_settings_changed({[key]: value})
      }
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
      const animation_image_column_width = Math.max(rendered_width / 2, animation_image_size_px + SCROLLBAR_WIDTH_PX)
      const animation_stats = [
         {name: [render_stat_label, KEY_TILES_TEST_ANIMATION_FRAME_INDEX], value: 0},
         ...(animation_frame_settings ? [
            {name: [render_stat_label, KEY_NAVIGATOR_FOCAL_POINT], value: [render_coordinates, animation_frame_settings.focal_point]},
            {name: [render_stat_label, KEY_NAVIGATOR_SCOPE], value: [render_scalar, animation_frame_settings.scope]},
         ] : []),
      ]
      const animation_content = <CoolStyles.Block style={{height: `${tab_content_height}px`, position: 'relative', overflow: 'hidden'}}>
         <div style={{height: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '0.5rem'}}>
            <label style={{display: 'flex', alignItems: 'center'}}>
               <span style={CELL_LABEL_STYLE}>{AppText.get(KEY_TILES_TEST_ANIMATION_FRAME_RATE)}</span>
               <select
                  value={frame_rate_value}
                  onChange={select_animation_setting(KEY_TILES_TEST_ANIMATION_FRAME_RATE_FPS, 'animation_frame_rate_fps', 'animation_frame_rate_custom')}
                  style={{marginLeft: '0.35rem'}}>
                  {FRAME_RATE_OPTIONS_FPS.map(value => <option key={value} value={value}>{format_frame_rate(value)}</option>)}
                  <option value={CUSTOM_OPTION}>{AppText.get(KEY_TILES_TEST_ANIMATION_CUSTOM)}</option>
               </select>
               {frame_rate_value === CUSTOM_OPTION && <input
                  type={'number'} min={'1'} step={'1'} value={animation_frame_rate_fps}
                  onChange={update_animation_setting(KEY_TILES_TEST_ANIMATION_FRAME_RATE_FPS, 'animation_frame_rate_fps')}
                  style={{marginLeft: '0.35rem', width: '5rem'}}
               />}
            </label>
            <label style={{display: 'flex', alignItems: 'center'}}>
               <span style={CELL_LABEL_STYLE}>{AppText.get(KEY_TILES_TEST_ANIMATION_IMAGE_SIZE)}</span>
               <select
                  value={image_size_value}
                  onChange={select_animation_setting(KEY_TILES_TEST_ANIMATION_IMAGE_SIZE_PX, 'animation_image_size_px', 'animation_image_size_custom')}
                  style={{marginLeft: '0.35rem'}}>
                  {IMAGE_SIZE_OPTIONS_PX.map(value => <option key={value} value={value}>{value} ({format_pixel_count(value)})</option>)}
                  <option value={CUSTOM_OPTION}>{AppText.get(KEY_TILES_TEST_ANIMATION_CUSTOM)}</option>
               </select>
               {image_size_value === CUSTOM_OPTION && <input
                  type={'number'} min={'1'} step={'1'} value={animation_image_size_px}
                  onChange={update_animation_setting(KEY_TILES_TEST_ANIMATION_IMAGE_SIZE_PX, 'animation_image_size_px')}
                  style={{marginLeft: '0.35rem', width: '5rem'}}
               />}
            </label>
            <label style={{display: 'flex', alignItems: 'center'}}>
               <span style={CELL_LABEL_STYLE}>{AppText.get(KEY_TILES_TEST_ANIMATION_FRAME_COUNT)}</span>
               <select
                  value={frame_count_value}
                  onChange={select_animation_setting(KEY_TILES_TEST_ANIMATION_FRAME_COUNT_SETTING, 'animation_frame_count', 'animation_frame_count_custom')}
                  style={{marginLeft: '0.35rem'}}>
                  {FRAME_COUNT_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}
                  <option value={CUSTOM_OPTION}>{AppText.get(KEY_TILES_TEST_ANIMATION_CUSTOM)}</option>
               </select>
            {frame_count_value === CUSTOM_OPTION && <input
                  type={'number'} min={'1'} step={'1'} value={animation_frame_count}
                  onChange={update_animation_setting(KEY_TILES_TEST_ANIMATION_FRAME_COUNT_SETTING, 'animation_frame_count')}
                  style={{marginLeft: '0.35rem', width: '5rem'}}
               />}
            </label>
            <styles.BlueButton onClick={this.load_test} style={{marginTop: '0.5rem', marginBottom: '0.5rem'}}>
               {AppText.get(KEY_TILES_TEST_ANIMATION_LOAD)}
            </styles.BlueButton>
         </div>
         <div style={{height: 'calc(100% - 2.5rem)', display: 'flex', minWidth: 0, background: BACKGROUND_FIELD_GRADIENT}}>
            <div style={{flex: `0 0 ${animation_image_column_width}px`, minWidth: 0, display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', overflow: 'auto', background: BACKGROUND_FIELD_GRADIENT}}>
               {animation_frame_settings ? <div style={{marginLeft: 'auto', marginRight: '1rem', marginTop: '1rem', flex: '0 0 auto'}}><FractoRasterImage
                  width_px={animation_image_size_px}
                  focal_point={animation_frame_settings.focal_point}
                  scope={animation_frame_settings.scope}
                  aspect_ratio={1.0}
               /></div> : <canvas
                  width={animation_image_size_px}
                  height={animation_image_size_px}
                  style={{width: `${animation_image_size_px}px`, height: `${animation_image_size_px}px`, marginLeft: 'auto', marginRight: '1rem', marginTop: '1rem', flex: '0 0 auto', aspectRatio: '1 / 1', backgroundColor: '#d3d3d3'}}
               />}
            </div>
            <div style={{width: '1px', flex: '0 0 1px', margin: '0 1rem 0 0', backgroundColor: '#aaaaaa'}} />
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
      return [
         <styles.SectionTitle key={'test-harness-title'}>
            {AppText.get(KEY_TILES_TEST_HARNESS)}
         </styles.SectionTitle>,
         <CoolStyles.Block
            key={'test-harness-tabs'}
            ref={container_ref}
            style={{
               height: `${available_height}px`,
               position: 'relative',
               overflow: 'hidden',
            }}>
            <CoolTabs
               labels={[AppText.get(KEY_TILES_TEST_BENCHMARKS), AppText.get(KEY_TILES_TEST_ANIMATION)]}
               tab_index={tab_index}
               on_tab_select={this.on_tab_select}
               selected_content={tab_index === 0 ? benchmark_content : animation_content}
            />
         </CoolStyles.Block>,
      ]
   }
}

export default TilesTest
