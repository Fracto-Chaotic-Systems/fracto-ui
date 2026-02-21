import FractoUtil from "../../../../../../sdk/FractoUtil.js";
import {
   Chart as ChartJS,
   LinearScale,
   LineElement,
   Tooltip,
   Legend,
   LogarithmicScale,
   PointElement,
} from 'chart.js';
import {Scatter} from 'react-chartjs-2';
import {FRACTO_DATA_PORT, FRACTO_UI_PORT} from "../../../../../../constants.js";

ChartJS.register(
   LinearScale,
   LineElement,
   PointElement,
   Tooltip,
   Legend,
   LogarithmicScale
)

export class OrbitalMagnitudes {

   static read_vector_data = async (theta_num = 5, theta_den = 11, precision = 24) => {
      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_DATA_PORT}`)
      const url = `${origin}/radian_data?theta_num=${theta_num}&theta_den=${theta_den}&precision=${precision}`
      const output_json = await fetch(url, {}).then(res => res.json())
      // console.log('url', url)
      // console.log('output_json', output_json)
      return output_json
   }

   static magnitudes_chart = (vector_data, on_hover) => {
      console.log('vector_data', vector_data)
      const chart_data = vector_data.map(data => {
         return {
            x: parseInt(data.r_num) / parseInt(data.r_den),
            y: parseFloat(data.magnitude),
            cardinality: parseInt(data.cardinality)
         }
      })
         .sort((a, b) => a.x - b.x)
      console.log('chart_data', chart_data)
      const data = {
         labels: chart_data.map(data => data.x),
         datasets: [
            {
               label: 'magnitudes',
               data: chart_data,
               pointRadius: 2,
               backgroundColor: chart_data.map(data =>
                  data.estimated
                     ? 'black'
                     : FractoUtil.fracto_pattern_color(data.cardinality, 1000)),
               barThickness: 'flex',
            },
         ],
      }
      const options = {
         maintainAspectRatio: false,
         scales: {
            // x: {type: 'logarithmic'},
            y: {type: 'logarithmic'},
         },
         onHover: (event, activeElements) => {
            if (activeElements.length && on_hover) {
               on_hover(activeElements[0])
            }
         }
      };
      return <Scatter data={data} options={options}/>
   }
}

export default OrbitalMagnitudes
