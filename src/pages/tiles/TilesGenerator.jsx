import React, {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import {KEY_TILES_GENERATE} from "../../text/TilesText.jsx";

import {INCLUDE_CAN_DO} from "../../utils/render/FractoTileCoverage.jsx";
import {TILE_GENERATOR_SPLITTER_KEYS} from "../../navigator/NavigatorKeys.jsx";

import NavigatorCoverage from "../../navigator/NavigatorCoverage.jsx";
import GeneratorControl from "./generator/GeneratorControl.jsx";
import GeneratorOperations from "./generator/GeneratorOperations.jsx";

export class TilesGenerator extends Component {
   state = {
      coverage_data: [],
      short_codes: [],
   }

   on_coverage_data = (coverage_data) => {
      this.setState({coverage_data})
   }

   on_generate = (short_codes) => {
      console.log('on_generate', short_codes.length)
      this.setState({short_codes})
   }

   control_block = () => {
      const {coverage_data} = this.state
      return <GeneratorControl
         coverage_data={coverage_data}
         on_generate={this.on_generate}
      />
   }

   operations_block = () => {
      const {short_codes} = this.state
      return <GeneratorOperations
         short_codes={short_codes}
      />
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
