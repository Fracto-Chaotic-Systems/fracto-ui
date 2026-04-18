import React, {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppSettings from "../../AppSettings.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../../settings/RootSettings.jsx";
import {
   KEY_TILES_GENERATOR_FRAME_SETTINGS,
   KEY_TILES_SPLITTER_POS_PX
} from "../../settings/TilesSettings.jsx";
import AppText from "../../AppText.jsx";
import {KEY_TILES_GENERATE} from "../../text/TilesText.jsx";

import {INCLUDE_CAN_DO} from "../../utils/render/FractoTileCoverage.jsx";
import GeneratorRun from "./generator/GeneratorRun.jsx";
import NavigatorCoverage from "../../navigator/NavigatorCoverage.jsx";
import {TILE_GENERATOR_SPLITTER_KEYS} from "../../navigator/NavigatorKeys.jsx";

const UPDATE_INTERVAL_MS = 1000

export class TilesGenerator extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      frame_settings: {},
      coverage_data: [],
      interval: null,
   }

   componentDidMount() {
      this.setState({
         frame_settings: AppSettings
            .get(KEY_TILES_GENERATOR_FRAME_SETTINGS),
         interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
      })
   }

   componentWillUnmount() {
      const {interval} = this.state
      if (interval) {
         clearInterval(interval)
      }
   }

   update_dimensions = () => {
      const {rendered_width, rendered_height} = this.state;
      const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS)
      const splitter_width = AppSettings.get(KEY_TILES_SPLITTER_POS_PX)
      const rendered_width_changed = rendered_width !== viewport_dimensions.width - splitter_width
      const rendered_height_changed = rendered_height !== viewport_dimensions.height
      if (rendered_height_changed || rendered_width_changed) {
         this.setState({
            rendered_width: viewport_dimensions.width - splitter_width,
            rendered_height: viewport_dimensions.height,
         })
      }
   }

   on_coverage_data = (coverage_data) => {
      this.setState({coverage_data})
   }

   on_busy = () => {
   }

   control_block = () => {
      const {coverage_data} = this.state
      return <GeneratorRun
         coverage_data={coverage_data}
         on_busy={this.on_busy}
      />
   }

   operations_block = () => {
      return 'operations_block'
   }

   render() {
      return [
         <styles.SectionTitle
            key={'tiles-overview-title'}>
            {AppText.get(KEY_TILES_GENERATE)}
         </styles.SectionTitle>,
         <NavigatorCoverage
            splitter_keys={TILE_GENERATOR_SPLITTER_KEYS}
            control_block={this.control_block()}
            results_block={this.operations_block()}
            on_coverage_data={this.on_coverage_data}
            options={[INCLUDE_CAN_DO]}
         />,
      ];
   }
}

export default TilesGenerator
