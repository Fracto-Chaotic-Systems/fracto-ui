import React, {Component} from "react";
import PropTypes from "prop-types";
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
   KEY_TILES_TEST_STEP_INDEX,
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
} from "../../../settings/TilesSettings.jsx";
import { build_chart_data, get_chart_minimum, chart_options} from "./BenchmarksUtils.jsx"

ChartJS.register(...registerables)

/** Renders the independent benchmark test tab. */
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
   
   /** Loads the latest benchmark report when the tab mounts. */
   componentDidMount() {
      TilesBackend.benchmark_results()
         .then(benchmark_results => this.setState({benchmark_results}))
         .catch(benchmark_error => {
            console.error('benchmark results fetch error', benchmark_error)
            this.setState({benchmark_error})
         })
   }
   
   /** Toggles visibility for all datasets represented by a legend key. */
   toggle_legend = legend_key => {
      this.setState(previous => ({
         hidden_legend_keys: previous.hidden_legend_keys.includes(legend_key)
            ? previous.hidden_legend_keys.filter(key => key !== legend_key)
            : [...previous.hidden_legend_keys, legend_key],
      }))
   }
   
   /** Renders benchmark controls and the timing chart. */
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
