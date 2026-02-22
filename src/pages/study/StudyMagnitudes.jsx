import {Component} from "react";

import {
   MainStyles as styles,
   MARGIN_PX
} from '../../styles/MainStyles.jsx'
import CoolStyles from '../../utils/ui/styles/CoolStyles.jsx'
import CoolWindowListener from "../../utils/ui/CoolWindowListener.jsx";
import AppSettings from "../../AppSettings.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../../settings/RootSettings.jsx";
import {KEY_STUDY_SPLITTER_POS_PX} from "../../settings/StudySettings.jsx";
import AppText from "../../AppText.jsx";
import {KEY_STUDY_MAGNITUDES} from "../../text/StudyText.jsx";

import MeridianChart from "../utils/MeridianChart.jsx";

import OrbitalMagnitudes from "./magnitudes/OrbitalMagnitudes.jsx";
import FareySequenceList from "./magnitudes/FareySequenceList.jsx";

const HEIGHT_FACTOR = 0.43
const RADIAN_SIZE_FACTOR = 3.5
const UPDATE_INTERVAL_MS = 5000

export class StudyMagnitudes extends Component {

   state = {
      rendered_width: 0,
      rendered_height: 0,
      vector_data: {file_contents: []},
      interval: null,
   }

   componentDidMount() {
      this.update_dimensions()
      setTimeout(() => {
         this.get_vector_data()
      }, 100)
   }

   componentWillUnmount() {
      const {interval} = this.state
      if (interval) {
         clearInterval(interval)
      }
   }

   get_vector_data = async () => {
      const vector_data = await OrbitalMagnitudes
         .read_vector_data(1, 3, 24)
      // console.log('vector_data', vector_data)
      this.setState({vector_data})
   }

   update_dimensions() {
      const interval = setInterval(() => {
         const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS)
         this.setState({
            rendered_width: viewport_dimensions.width,
            rendered_height: viewport_dimensions.height,
         })
      }, UPDATE_INTERVAL_MS)
      this.setState({interval})
   }

   on_hover = (e) => {
      console.log('on_hover', e.element.$context.raw)
   }

   get_filtered_data = () => {
      const {vector_data} = this.state
      return vector_data
         .file_contents
         .filter(value => {
            return (
               parseFloat(value.r) > 0.999
               && parseFloat(value.r) < 1.0
            )
         })
         .sort((a, b) => parseFloat(a.r) - parseFloat(b.r))
   }

   render_magnitudes_chart = (rendered_width, rendered_height) => {
      const {vector_data} = this.state
      if (!rendered_width || !rendered_height) {
         return <styles.InlineContentWrapper/>
      }
      const splitter_width = AppSettings.get(KEY_STUDY_SPLITTER_POS_PX)
      const content_width = rendered_width - splitter_width
      const background_style = {
         width: `${content_width * 0.95}px`,
         height: `${rendered_height * HEIGHT_FACTOR - MARGIN_PX}px`,
      }
      const filtered_data = this.get_filtered_data()
      const magnitudes = OrbitalMagnitudes.magnitudes_chart(filtered_data, this.on_hover)
      return <styles.InlineContentWrapper style={background_style}>
         {magnitudes}
      </styles.InlineContentWrapper>
   }

   on_resize = (viewport) => {
      console.log('on_resize', viewport)
      AppSettings.on_settings_changed({
         KEY_VIEWPORT_DIMENSIONS: viewport
      })
   }

   render() {
      const {rendered_width, rendered_height} = this.state
      const splitter_width = AppSettings.get(KEY_STUDY_SPLITTER_POS_PX)
      const magnitudes_chart = this.render_magnitudes_chart(rendered_width, rendered_height)
      const contents_style = {
         width: '100%',
         height: '100%',
         overflow: 'auto',
      }
      const charts_style = {
         width: `${0.3 * (rendered_width - splitter_width)}px`,
         height: `${rendered_height * 0.4}px`,
      }
      return [
         <styles.FloatRight>
            <CoolWindowListener
               size_px={18}
               on_resize={this.on_resize}
               wrapper={this}
            />
         </styles.FloatRight>,
         <styles.SectionTitle
            key={'study-overview-title'}>
            {AppText.get(KEY_STUDY_MAGNITUDES)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            style={contents_style}
            key={'input-form'}>
            <CoolStyles.InlineBlock>
               <MeridianChart
                  height_px={rendered_height / RADIAN_SIZE_FACTOR}
                  width_px={(rendered_width - splitter_width) / RADIAN_SIZE_FACTOR}
               />
            </CoolStyles.InlineBlock>
            <styles.OneRemSpacer/>
            <styles.InlineContentWrapper
               style={{height: `${rendered_height * 0.4}px`}}>
               <FareySequenceList
                  height_px={charts_style.height}
               />
            </styles.InlineContentWrapper>
            <styles.OneRemSpacer/>
            <styles.InlineContentWrapper
               style={charts_style}>
            </styles.InlineContentWrapper>
            {magnitudes_chart}
         </styles.CenteredBlock>,
      ];
   }
}

export default StudyMagnitudes
