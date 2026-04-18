import React, {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_ASSETS_VIDEO} from "../../text/AssetsText.jsx";
import AppText from "../../AppText.jsx";
import NavigatorCoverage from "../../navigator/NavigatorCoverage.jsx";
import {VIDEO_GENERATOR_SPLITTER_KEYS} from "../../navigator/NavigatorKeys.jsx";

export class AssetsVideo extends Component {
   state = {
      have_coverage: false
   }

   control_block = () => {
      return 'AssetsVideo control block'
   }

   on_coverage_data = (coverage_data) => {
      this.setState({have_coverage: coverage_data !== null})
   }

   operations_block = () => {
      return 'AssetsVideo operations block'
   }

   render() {
      return [
         <styles.SectionTitle
            key={'assets-video-title'}>
            {AppText.get(KEY_ASSETS_VIDEO)}
         </styles.SectionTitle>,
         <NavigatorCoverage
            splitter_keys={VIDEO_GENERATOR_SPLITTER_KEYS}
            control_block={this.control_block()}
            results_block={this.operations_block()}
            on_coverage_data={this.on_coverage_data}
         />
      ];
   }
}

export default AssetsVideo
