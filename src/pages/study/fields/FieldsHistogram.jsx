import {Component} from 'react';
import PropTypes from 'prop-types';
import {
   Chart as ChartJS,
   CategoryScale,
   LinearScale,
   BarElement,
   Title,
   Tooltip,
   Legend,
} from 'chart.js';
import {Bar} from 'react-chartjs-2';

import {
   KEY_COMPS_HEIGHT_PX,
   KEY_COMPS_WIDTH_PX
} from "pages/settings/PaneSettings";
import {KEY_CANVAS_BUFFER, KEY_UPDATE_INDEX} from 'pages/settings/AppSettings'
import FractoUtil from "fracto/FractoUtil";
import CoolStyles from "common/ui/styles/CoolStyles";
import PageSettings from "../../../PageSettings";

ChartJS.register(
   CategoryScale,
   LinearScale,
   BarElement,
   Title,
   Tooltip,
   Legend
);

const COMP_WIDTH_FACTOR = 0.35
const COMP_HEIGHT_FACTOR = 0.40

export class FieldsHistogram extends Component {
   static propTypes = {
      page_settings: PropTypes.object.isRequired,
      on_settings_changed: PropTypes.func.isRequired,
   }
   state = {
      bin_list: [],
      stored_values: {},
      interval: null,
   }

   componentDidMount() {
      const {stored_values} = this.state
      const {page_settings} = this.props
      this.setState({
         stored_values: {
            [KEY_UPDATE_INDEX]: 0,
         }
      });
      const interval = setInterval(() => {
         const settings_changed = PageSettings.test_update_settings(
            [KEY_UPDATE_INDEX], page_settings, stored_values)
         if (settings_changed) {
            this.setState({stored_values})
            this.fill_histogram()
         }
      }, 500)
      this.setState({interval})
   }

   componentWillUnmount() {
      const {interval} = this.state
      if (interval) {
         clearInterval(interval)
      }
   }

   fill_histogram = () => {
      const {page_settings} = this.props
      const canvas_buffer = page_settings[KEY_CANVAS_BUFFER]
      if (!canvas_buffer || !canvas_buffer.length) {
         return;
      }
      // console.log('canvas_buffer', canvas_buffer);
      let non_orbital_bins = {}
      canvas_buffer.forEach(row => {
         row.forEach(cell => {
            const [pattern, iterations] = cell;
            if (pattern !== 0) {
               return;
            }
            const non_orbital_key = `_${iterations}`
            if (!non_orbital_bins[non_orbital_key]) {
               non_orbital_bins[non_orbital_key] = 0;
            }
            non_orbital_bins[non_orbital_key]++
         })
      });
      const bin_keys = Object.keys(non_orbital_bins)
      const bin_list = bin_keys
         .filter(bin_key => non_orbital_bins[bin_key] > 10)
         .map(bin_key => {
            return {
               iterations: parseInt(bin_key.slice(1), 10),
               count: non_orbital_bins[bin_key]
            }
         }).sort((a, b) => {
            return b.iterations - a.iterations;
         })
      this.setState({bin_list})
      // console.log('bin_list', bin_list)
   }

   render() {
      const {bin_list} = this.state
      const {page_settings} = this.props
      const data = {
         labels: bin_list.map(bin => bin.iterations),
         datasets: [
            {
               label: 'escapes',
               data: bin_list.map(bin => bin.count),
               backgroundColor: bin_list.map(bin =>
                  FractoUtil.fracto_pattern_color(0, bin.iterations)),
               barThickness: 'flex',
            },
         ],
      }
      const options = {
         maintainAspectRatio: false,
         scales: {
            x: {type: 'logarithmic'},
            y: {type: 'logarithmic'},
         },
         animation: false,
      };
      const height = page_settings[KEY_COMPS_HEIGHT_PX] * COMP_HEIGHT_FACTOR
      const width = page_settings[KEY_COMPS_WIDTH_PX] * COMP_WIDTH_FACTOR
      const chartStyle = {
         height: `${height}px`, width: `${width}px`
      }
      return <CoolStyles.InlineBlock style={chartStyle}>
         <Bar data={data} options={options}/>
      </CoolStyles.InlineBlock>
   }
}

export default FieldsHistogram
