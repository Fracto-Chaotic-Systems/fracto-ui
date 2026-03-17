import {Component} from 'react';

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

import CoolStyles from "../../../utils/ui/styles/CoolStyles";
import FractoColors from "../../../utils/render/FractoColors.jsx";
import {collect_orbitals} from "./CanvasBufferUtils";
import PropTypes from "prop-types";

ChartJS.register(
   CategoryScale,
   LinearScale,
   BarElement,
   Title,
   Tooltip,
   Legend
);

const COMP_WIDTH_FACTOR = 0.55
const COMP_HEIGHT_FACTOR = 0.40

export class FieldsColorChart extends Component {
   static propTypes = {
      bounding_rect: PropTypes.object.isRequired,
      frame_settings: PropTypes.object.isRequired,
      frame_settings_key: PropTypes.string.isRequired,
   }
   state = {
      orbital_bins: {},
      stored_width_px: 1,
      stored_height_px: 1,
      stored_scope: 1,
      stored_focal_point_x: 1,
      stored_focal_point_y: 1,
      step_scopes: []
   }

   componentDidMount() {
      const {bounding_rect} = this.props
      this.setState({
         stored_width_px: bounding_rect.width,
         stored_height_px: bounding_rect.height,
      })
      setTimeout(this.fill_pattern_bins, 100)
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
      const {bounding_rect, frame_settings} = this.props
      const width_changed =
         this.state.stored_width_px !== bounding_rect.width
      const height_changed =
         this.state.stored_height_px !== bounding_rect.height
      const scope_changed =
         this.state.stored_scope !== frame_settings.scope
      const focal_point_x_changed =
         this.state.stored_focal_point_x !== frame_settings.focal_point.x
      const focal_point_y_changed =
         this.state.stored_focal_point_y !== frame_settings.focal_point.y
      if (width_changed || height_changed || scope_changed || focal_point_x_changed || focal_point_y_changed) {
         this.setState({
            stored_width_px: bounding_rect.width,
            stored_height_px: bounding_rect.height,
            stored_scope: frame_settings.scope,
            stored_focal_point_x: frame_settings.focal_point.x,
            stored_focal_point_y: frame_settings.focal_point.y,
         })
         this.fill_pattern_bins()
      }
   }

   fill_pattern_bins = () => {
      const {page_settings} = this.props
      const {canvas_buffer} = page_settings
      if (!canvas_buffer) {
         return false;
      }
      const orbital_bins = collect_orbitals(canvas_buffer)
      this.setState({orbital_bins})
      return true
   }

   render() {
      const {orbital_bins} = this.state
      const {page_settings} = this.props
      const bin_keys = Object.keys(orbital_bins)
         .filter(key => orbital_bins[key].orbital > 0)
         .filter(key => orbital_bins[key].bin_count > 10)
         .sort((a, b) => orbital_bins[a].orbital - orbital_bins[b].orbital)
      if (bin_keys.length === 0) {
         return <CoolStyles.InlineBlock>
            {'Loading orbitals data...'}
         </CoolStyles.InlineBlock>
      }
      const data = {
         labels: bin_keys.map(key => parseInt(orbital_bins[key].orbital)),
         datasets: [
            {
               label: 'orbitals',
               data: bin_keys.map(key => orbital_bins[key].bin_count),
               backgroundColor: bin_keys
                  .map(key => FractoColors.pattern_color_hsl(orbital_bins[key].orbital)),
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
      };
      const chartStyle = {
         height: `${page_settings[KEY_COMPS_HEIGHT_PX] * COMP_HEIGHT_FACTOR}px`,
         width: `${page_settings[KEY_COMPS_WIDTH_PX] * COMP_WIDTH_FACTOR}px`,
      }
      return <CoolStyles.InlineBlock style={chartStyle}>
         <Bar data={data} options={options}/>
      </CoolStyles.InlineBlock>
   }
}

export default FieldsColorChart
