import React, {Component} from "react";
import {Bar, Line} from 'react-chartjs-2';
import {Chart as ChartJS, registerables} from 'chart.js';

import {FRACTO_TILES_PORT} from "../../../../../constants.js";
import CoolTable from "../../utils/ui/CoolTable.jsx";
import {CELL_ALIGN_LEFT, CELL_ALIGN_RIGHT, CELL_TYPE_TEXT} from "../../utils/ui/styles/CoolTableStyles.jsx";
import {MainStyles as styles, MARGIN_PX, TITLE_BAR_HEIGHT_PX} from '../../styles/MainStyles.jsx'
import ChartStyles from '../../chart/ChartStyles.jsx';
import AppText from "../../AppText.jsx";
import {KEY_TILES_STATUS, KEY_TILES_STATUS_EFFECTIVENESS} from "../../text/TilesText.jsx";
import {KEY_TILES_SPLITTER_POS_PX} from "../../settings/TilesSettings.jsx";
import {update_dimensions} from "../PageUtils.jsx";
import {service_origin} from "../../utils/service_origin.jsx";

ChartJS.register(...registerables)

const REFRESH_INTERVAL_MS = 5000
const MAX_HISTORY_POINTS = 60
const CHART_CONTENT_RESERVE_PX = 250
const METRIC_KEYS = [
   'requests', 'memory_hits', 'disk_hits', 'downloads', 'failures',
   'coalesced_requests', 'evictions', 'in_memory', 'in_flight', 'error_count',
]
const METRIC_COLORS = ['#557799', '#228b22', '#8a2be2', '#d2691e', '#b22222', '#008b8b', '#c47f00', '#666666', '#6495ed', '#dc143c']
const metric_label = key => key.replaceAll('_', ' ')

const chart_options = {
   responsive: true,
   maintainAspectRatio: false,
   animation: false,
   scales: {y: {type: 'logarithmic', beginAtZero: false, min: 1}},
}
const RATIO_COLUMNS = [
   {id: 'metric', label: 'metric:', type: CELL_TYPE_TEXT, width_px: 240, align: CELL_ALIGN_LEFT, style: {backgroundColor: 'white'}},
   {id: 'value', label: 'value:', type: CELL_TYPE_TEXT, width_px: 120, align: CELL_ALIGN_RIGHT, style: {backgroundColor: 'white'}},
]
const ratio = (numerator, denominator) => denominator ? `${(numerator / denominator * 100).toFixed(1)}%` : '—'

export class TilesStatus extends Component {
   state = {
      stats: null, history: [], error: null, interval: null,
      rendered_width: 0, rendered_height: 0, dimensions_interval: null,
      container_ref: React.createRef(),
   }

   componentDidMount() {
      this.refresh_stats()
      this.update_dimensions()
      this.setState({
         interval: setInterval(this.refresh_stats, REFRESH_INTERVAL_MS),
         dimensions_interval: setInterval(this.update_dimensions, 1000),
      })
   }

   componentWillUnmount() {
      if (this.state.interval) clearInterval(this.state.interval)
      if (this.state.dimensions_interval) clearInterval(this.state.dimensions_interval)
      this.unmounted = true
   }

   update_dimensions = () => {
      const {rendered_width, rendered_height} = this.state
      const new_values = update_dimensions(rendered_width, rendered_height, KEY_TILES_SPLITTER_POS_PX)
      if (new_values && !this.unmounted) this.setState(new_values)
   }

   refresh_stats = async () => {
      try {
         const response = await fetch(`${service_origin(FRACTO_TILES_PORT)}/cache_status`)
         if (!response.ok) throw new Error(`HTTP ${response.status}`)
         const stats = await response.json()
         if (this.unmounted) return
         const server_history = Array.isArray(stats.history)
            ? stats.history.map(point => ({
               timestamp: new Date(point.timestamp),
               stats: point,
            }))
            : []
         this.setState(previous => ({
            stats,
            history: server_history.slice(-MAX_HISTORY_POINTS),
            error: null,
         }))
      } catch (error) {
         if (!this.unmounted) this.setState({error: error.message})
      }
   }

   get_current_chart_data = () => {
      const {stats} = this.state
      return {
         labels: METRIC_KEYS.map(metric_label),
         datasets: [{
            label: 'current value',
            data: METRIC_KEYS.map(key => Number(stats?.[key] || 0)),
            backgroundColor: METRIC_COLORS,
         }],
      }
   }

   get_history_chart_data = () => {
      const {history} = this.state
      return {
         labels: history.map(point => point.timestamp.toLocaleTimeString()),
         datasets: METRIC_KEYS.map((key, index) => ({
            label: metric_label(key),
            data: history.map(point => Number(point.stats?.[key] || 0)),
            borderColor: METRIC_COLORS[index],
            backgroundColor: METRIC_COLORS[index],
            tension: 0.2,
            pointRadius: 1,
         })),
      }
   }

   get_ratio_data = () => {
      const {stats} = this.state
      const requests = Number(stats?.requests || 0)
      const memory_hits = Number(stats?.memory_hits || 0)
      const disk_hits = Number(stats?.disk_hits || 0)
      return [
         {metric: 'memory hit ratio', value: ratio(memory_hits, requests)},
         {metric: 'disk hit ratio', value: ratio(disk_hits, requests)},
         {metric: 'local hit ratio', value: ratio(memory_hits + disk_hits, requests)},
         {metric: 'download / miss ratio', value: ratio(Number(stats?.downloads || 0), requests)},
         {metric: 'failure ratio', value: ratio(Number(stats?.failures || 0), requests)},
      ]
   }

   render() {
      const {stats, history, error, rendered_width, rendered_height, container_ref} = this.state
      const chart_width = Math.max(250, Math.floor(rendered_width / 2) - 4 * MARGIN_PX)
      const container_bounds = container_ref.current?.getBoundingClientRect()
      const top = container_bounds?.top || 0
      // `top` already includes the section title. Add its height back when
      // calculating the pane space, matching the established page layout
      // dimension convention.
      const available_height = rendered_height - top + TITLE_BAR_HEIGHT_PX - 2 * MARGIN_PX
      const charts_stacked = rendered_width < 2 * (chart_width + 3 * MARGIN_PX)
      const chart_height = Math.max(220, Math.min(420,
         Math.floor((available_height - CHART_CONTENT_RESERVE_PX) / (charts_stacked ? 2 : 1))))
      return [
         <styles.SectionTitle
            key={'tiles-status-title'}>
            {AppText.get(KEY_TILES_STATUS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock key={'tiles-status-content'} ref={container_ref}>
            {error && <div style={{color: '#b22222', fontStyle: 'italic', fontWeight: 'bold'}}>
               Unable to load tile cache statistics: {error}
            </div>}
            {stats && <>
               <div style={{margin: '0.75rem auto 0.25rem', fontWeight: 'bold'}}>
                  {AppText.get(KEY_TILES_STATUS_EFFECTIVENESS)}
               </div>
               <styles.TableWrapper><CoolTable columns={RATIO_COLUMNS} data={this.get_ratio_data()}/></styles.TableWrapper>
            </>}
            <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center'}}>
               <ChartStyles.InlineChartWrapper style={{width: `${chart_width}px`, height: `${chart_height}px`}}>
                  <Bar data={this.get_current_chart_data()} options={chart_options}/>
               </ChartStyles.InlineChartWrapper>
               <ChartStyles.InlineChartWrapper style={{width: `${chart_width}px`, height: `${chart_height}px`}}>
                  <Line data={this.get_history_chart_data()} options={chart_options}/>
               </ChartStyles.InlineChartWrapper>
            </div>
            {!stats && !error && <div>Loading tile cache statistics...</div>}
            {history.length > 0 && <div style={{color: '#777777', fontSize: '0.8rem'}}>
               {history.length} history sample{history.length === 1 ? '' : 's'} collected while this page was active
            </div>}
         </styles.CenteredBlock>,
      ];
   }
}

export default TilesStatus
