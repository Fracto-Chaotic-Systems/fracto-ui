import {Component} from "react";
import {Bar, Line} from 'react-chartjs-2';
import {Chart as ChartJS, registerables} from 'chart.js';

import {FRACTO_TILES_PORT} from "../../../../../constants.js";
import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import ChartStyles from '../../chart/ChartStyles.jsx';
import AppText from "../../AppText.jsx";
import {KEY_TILES_STATUS} from "../../text/TilesText.jsx";

ChartJS.register(...registerables)

const REFRESH_INTERVAL_MS = 5000
const MAX_HISTORY_POINTS = 60
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

export class TilesStatus extends Component {
   state = {stats: null, history: [], error: null, interval: null}

   componentDidMount() {
      this.refresh_stats()
      this.setState({interval: setInterval(this.refresh_stats, REFRESH_INTERVAL_MS)})
   }

   componentWillUnmount() {
      if (this.state.interval) clearInterval(this.state.interval)
      this.unmounted = true
   }

   refresh_stats = async () => {
      try {
         const response = await fetch(`http://127.0.0.1:${FRACTO_TILES_PORT}/cache_status`)
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

   render() {
      const {stats, history, error} = this.state
      return [
         <styles.SectionTitle
            key={'tiles-status-title'}>
            {AppText.get(KEY_TILES_STATUS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock key={'tiles-status-content'}>
            {error && <div style={{color: '#b22222', fontStyle: 'italic', fontWeight: 'bold'}}>
               Unable to load tile cache statistics: {error}
            </div>}
            <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center'}}>
               <ChartStyles.InlineChartWrapper style={{width: '46vw', minWidth: '320px', height: '340px'}}>
                  <Bar data={this.get_current_chart_data()} options={chart_options}/>
               </ChartStyles.InlineChartWrapper>
               <ChartStyles.InlineChartWrapper style={{width: '46vw', minWidth: '320px', height: '340px'}}>
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
