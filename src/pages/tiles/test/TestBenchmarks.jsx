import React, {Component} from "react";
import {Line} from 'react-chartjs-2';
import {Chart as ChartJS, registerables} from 'chart.js';

import AppText from "../../../AppText.jsx";
import AppSettings from "../../../AppSettings.jsx";
import {
   KEY_TILES_TEST_DURATION_MS,
   KEY_TILES_TEST_COMBINE_RESULTS,
   KEY_TILES_TEST_COMBINATION_SIMPLE,
   KEY_TILES_TEST_COMBINATION_SIMPLE_HELP,
   KEY_TILES_TEST_COMBINATION_INTERPOLATED,
   KEY_TILES_TEST_COMBINATION_INTERPOLATED_HELP,
   KEY_TILES_TEST_LEGACY_MAX,
   KEY_TILES_TEST_LEGACY_MEDIAN,
   KEY_TILES_TEST_LEGACY_MIN,
   KEY_TILES_TEST_STEP_INDEX,
   KEY_TILES_TEST_TURBO_MAX,
   KEY_TILES_TEST_TURBO_MEDIAN,
   KEY_TILES_TEST_TURBO_MIN,
} from "../../../text/TilesText.jsx";
import TilesBackend from "../../../backend/TilesBackend.jsx";
import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import CoolSelect from "../../../utils/ui/CoolSelect.jsx";
import {
   CELL_LABEL_STYLE,
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import {SETTING_LABEL_STYLE} from "../../../utils/ui/styles/CoolStyles.jsx";
import {
   KEY_TILES_TEST_COMBINE_RESULTS as KEY_TILES_TEST_COMBINE_RESULTS_SETTING,
   KEY_TILES_TEST_COMBINATION_METHOD,
   KEY_TILES_TEST_TAB,
} from "../../../settings/TilesSettings.jsx";

ChartJS.register(...registerables)

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
               borderWidth: metric_index === 1 ? 5 : (combine_results ? 1.5 : 0.75),
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

/** Placeholder for the independent benchmark test tab. */
export class TestBenchmarks extends Component {
   static propTypes = {
      width_px: PropTypes.number.isRequired,
      height_px: PropTypes.number.isRequired,
   }
   
   state = {
      benchmark_results: null,
      combine_results: AppSettings.get(KEY_TILES_TEST_COMBINE_RESULTS_SETTING),
      combination_method: AppSettings.get(KEY_TILES_TEST_COMBINATION_METHOD),
      hidden_legend_keys: [],
   }
   
   componentDidMount() {
      TilesBackend.benchmark_results()
         .then(benchmark_results => this.setState({benchmark_results}))
         .catch(benchmark_error => {
            console.error('benchmark results fetch error', benchmark_error)
            this.setState({benchmark_error})
         })
   }
   
   toggle_legend = legend_key => {
      this.setState(previous => ({
         hidden_legend_keys: previous.hidden_legend_keys.includes(legend_key)
            ? previous.hidden_legend_keys.filter(key => key !== legend_key)
            : [...previous.hidden_legend_keys, legend_key],
      }))
   }
   
   render() {
      const {benchmark_results, combine_results, combination_method, hidden_legend_keys} = this.state
      const {height_px} = this.props
      const chart_data = benchmark_results && build_chart_data(benchmark_results, combine_results, hidden_legend_keys, combination_method)
      return <CoolStyles.Block style={{height: `${height_px}px`, position: 'relative', overflow: 'hidden'}}>
         <div style={{height: '2rem', display: 'flex', alignItems: 'center', paddingLeft: '0.5rem'}}>
            <label style={SETTING_LABEL_STYLE}>
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
               <span style={{...CELL_LABEL_STYLE, marginLeft: '0.35rem'}}>
                  {AppText.get(KEY_TILES_TEST_COMBINE_RESULTS)}
               </span>
            </label>
            {combine_results && <CoolSelect
               options={[
                  {
                     value: 'simple',
                     label: AppText.get(KEY_TILES_TEST_COMBINATION_SIMPLE),
                     help: AppText.get(KEY_TILES_TEST_COMBINATION_SIMPLE_HELP)
                  },
                  {
                     value: 'interpolated',
                     label: AppText.get(KEY_TILES_TEST_COMBINATION_INTERPOLATED),
                     help: AppText.get(KEY_TILES_TEST_COMBINATION_INTERPOLATED_HELP)
                  },
               ]}
               value={combination_method}
               on_change={event => {
                  const combination_method = event.target.value
                  this.setState({combination_method})
                  AppSettings.on_settings_changed({[KEY_TILES_TEST_COMBINATION_METHOD]: combination_method})
               }}
               extra_style={{padding: 0, marginLeft: '0.5rem'}}
            />}
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
   }
}

export default TestBenchmarks
