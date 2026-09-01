import React, {Component} from "react";
import {Line} from 'react-chartjs-2';
import {Chart as ChartJS, registerables} from 'chart.js';

import {MainStyles as styles, TITLE_BAR_HEIGHT_PX} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import AppSettings from "../../AppSettings.jsx";
import {
   KEY_TILES_TEST_DURATION_MS,
   KEY_TILES_TEST_COMBINE_RESULTS,
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
import {update_dimensions} from "../PageUtils.jsx";
import {
   KEY_TILES_SPLITTER_POS_PX,
   KEY_TILES_TEST_COMBINE_RESULTS as KEY_TILES_TEST_COMBINE_RESULTS_SETTING,
} from "../../settings/TilesSettings.jsx";

ChartJS.register(...registerables)

const METRICS = [
   {key: 'min_ms', color: '#4472c4'},
   {key: 'median_ms', color: '#70ad47'},
   {key: 'max_ms', color: '#ed7d31'},
]
const STRATEGY_COLORS = {
   legacy: ['#4472c4', '#70ad47', '#ed7d31'],
   turbo: ['#7030a0', '#00a6a6', '#c00000'],
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

const build_chart_data = (benchmark_results, combine_results = false, hidden_legend_keys = []) => {
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
                  ? [...grouped_points.entries()].map(([x, values]) => ({
                     x,
                     y: values.reduce((sum, value) => sum + value, 0) / values.length,
                  }))
                  : points,
               borderColor: STRATEGY_COLORS[strategy][metric_index],
               backgroundColor: STRATEGY_COLORS[strategy][metric_index],
               borderWidth: combine_results ? 1.5 : 0.75,
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
      combine_results: AppSettings.get(KEY_TILES_TEST_COMBINE_RESULTS_SETTING),
      hidden_legend_keys: [],
      rendered_width: 0,
      rendered_height: 0,
      dimensions_interval: null,
      container_ref: React.createRef(),
   }

   componentDidMount() {
      this.update_dimensions()
      this.setState({dimensions_interval: setInterval(this.update_dimensions, 1000)})
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

   render() {
      const {benchmark_results, rendered_height, container_ref, combine_results, hidden_legend_keys} = this.state
      const chart_data = benchmark_results && build_chart_data(benchmark_results, combine_results, hidden_legend_keys)
      const top = container_ref.current?.getBoundingClientRect().top || TITLE_BAR_HEIGHT_PX
      const available_height = Math.max(0, rendered_height - top)
      const half_height = Math.floor(available_height / 2)
      return [
         <styles.SectionTitle key={'test-harness-title'}>
            {AppText.get(KEY_TILES_TEST_HARNESS)}
         </styles.SectionTitle>,
         <CoolStyles.Block
            key={'test-harness-grid'}
            ref={container_ref}
            style={{
               display: 'grid',
               gridTemplateColumns: '1fr 1fr',
               gridTemplateRows: `${half_height}px ${half_height}px`,
               height: `${half_height * 2}px`,
               border: '1px solid #cccccc',
               overflow: 'auto',
            }}>
            <div style={{borderRight: '1px solid #cccccc', borderBottom: '1px solid #cccccc', overflow: 'auto'}}>
            </div>
            <div style={{borderBottom: '1px solid #cccccc', overflow: 'auto'}}>
            </div>
            <div style={{gridColumn: '1 / span 2', minHeight: 0, height: `${half_height}px`, position: 'relative', overflow: 'hidden'}}>
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
            </div>
         </CoolStyles.Block>,
      ]
   }
}

export default TilesTest
