import {Component} from "react";
import {
   Chart as ChartJS,
   LinearScale,
   LineElement,
   Tooltip,
   Legend,
   PointElement,
} from 'chart.js';
import {Scatter} from 'react-chartjs-2';

// Register the necessary components
ChartJS.register(LinearScale, LineElement, PointElement, Tooltip, Legend)
import FractoUtil from "../../../../../sdk/FractoUtil.js";
import PropTypes from "prop-types";
import {MainStyles as styles, MARGIN_PX} from "../../styles/MainStyles.jsx";

const R_INC = 0.05
const MIN_R = 0.0
const MAX_R = 1.01

const MAX_CARDINALITY = 16
const POINT_SIZE = 1.5;

const GRID_CONFIG = {
   color: function (context) {
      return context.tick.value === 0 ? '#aaaaaa' : '#dddddd'
   },
   lineWidth: function (context) {
      return context.tick.value === 0 ? 1.5 : 1
   }
};

export class MeridianChart extends Component {
   static propTypes = {
      height_px: PropTypes.number.isRequired,
      width_px: PropTypes.number.isRequired,
   }

   generate_meridians = () => {
      const meridian_data = []
      for (let r = MIN_R; r <= MAX_R; r = r + R_INC) {
         for (let cardinality = 2; cardinality < MAX_CARDINALITY; cardinality++) {
            for (let aspect = 1; aspect < cardinality / 2; aspect++) {
               const theta = aspect / cardinality
               const P = FractoUtil.P_from_r_theta(r, theta)
               const found = meridian_data.find(m_d => m_d.x === P.x && m_d.y === P.y)
               if (!found) {
                  meridian_data.push({x: P.x, y: P.y, cardinality, aspect, r})
               }
            }
         }
      }
      const outline_data = []
      for (let theta = 0; theta < 0.50001; theta += 0.01) {
         for (let r = 0; r <= 1.001; r += 0.05) {
            const P = FractoUtil.P_from_r_theta(r, theta)
            outline_data.push({x: P.x, y: P.y, r})
         }
      }
      return [meridian_data, outline_data]
   }

   meridians_chart = () => {
      const options = {
         scales: {
            x: {grid: GRID_CONFIG,},
            y: {grid: GRID_CONFIG,}
         },
         animation: false,
         maintainAspectRatio: false,
         plugins: {
            legend: {
               display: false,
            },
         },
      }
      const datasets = []
      const meridians = this.generate_meridians()
      meridians[0].forEach((point) => {
         const target_id = `${point.aspect}/${point.cardinality}`
         let cardinality_set = datasets.find(dataset => {
            return dataset.Id === target_id
         })
         if (!cardinality_set && point.cardinality) {
            cardinality_set = {
               Id: target_id,
               label: `${point.aspect}/${point.cardinality}`,
               data: [],
               backgroundColor: FractoUtil.fracto_pattern_color(point.cardinality),
               pointRadius: POINT_SIZE,
               showLine: point.cardinality,
            }
            datasets.push(cardinality_set)
         }
         if (point.cardinality) {
            cardinality_set.data.push({x: point.x, y: point.y})
         }
      })

      meridians[1].forEach((point) => {
         let radius_set = datasets.find(dataset => {
            return dataset.r === point.r
         })
         if (!radius_set) {
            radius_set = {
               Id: `${point.r}`,
               r: point.r,
               label: `${point.r}`,
               data: [],
               backgroundColor: 'black',
               pointRadius: 0.125,
               showLine: true,
            }
            datasets.push(radius_set)
         }
         radius_set.data.push({x: point.x, y: point.y})
      })
      return <Scatter
         datasetIdKey='id1'
         data={{datasets}} options={options}
      />
   }

   render() {
      const {height_px, width_px} = this.props
      const background_style = {
         width: `${width_px - MARGIN_PX}px`,
         height: `${height_px - MARGIN_PX}px`,
      }
      const scatter = this.meridians_chart()
      return <styles.InlineContentWrapper
         style={background_style}>
         {scatter}
      </styles.InlineContentWrapper>
   }
}

export default MeridianChart
