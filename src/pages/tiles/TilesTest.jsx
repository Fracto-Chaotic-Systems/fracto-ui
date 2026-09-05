import React, {Component} from "react";

import {MainStyles as styles, TITLE_BAR_HEIGHT_PX} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import AppSettings from "../../AppSettings.jsx";
import {
   KEY_TILES_TEST_BENCHMARKS,
   KEY_TILES_TEST_ANIMATION,
   KEY_TILES_TEST_HARNESS,
} from "../../text/TilesText.jsx";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";
import CoolTabs from "../../utils/ui/CoolTabs.jsx";
import {update_dimensions} from "../PageUtils.jsx";
import TestAnimation from "./test/TestAnimation.jsx";
import {
   KEY_TILES_SPLITTER_POS_PX,
   KEY_TILES_TEST_TAB,
} from "../../settings/TilesSettings.jsx";
import TestBenchmarks from "./test/TestBenchmarks.jsx";

const TAB_HEADER_HEIGHT_PX = 32

export class TilesTest extends Component {
   state = {
      tab_index: 0,
      rendered_width: 0,
      rendered_height: 0,
      dimensions_interval: null,
      container_ref: React.createRef(),
   }
   
   componentDidMount() {
      const saved_tab = AppSettings.get(KEY_TILES_TEST_TAB)
      const tab_index = Number.isInteger(saved_tab) && saved_tab >= 0 && saved_tab <= 1 ? saved_tab : 0
      this.setState({tab_index})
      this.update_dimensions()
      this.setState({dimensions_interval: setInterval(this.update_dimensions, 1000)})
   }
   
   componentWillUnmount() {
      if (this.state.dimensions_interval) clearInterval(this.state.dimensions_interval)
      this.unmounted = true
   }
   
   update_dimensions = () => {
      const {rendered_width, rendered_height} = this.state
      const new_values = update_dimensions(rendered_width, rendered_height, KEY_TILES_SPLITTER_POS_PX)
      if (new_values && !this.unmounted) this.setState(new_values)
   }
   
   on_tab_select = tab_index => {
      this.setState({tab_index})
      AppSettings.on_settings_changed({[KEY_TILES_TEST_TAB]: tab_index})
   }
   
   render_test_tab = (tab_index, tab_content_height) => {
      // Every tab occupies the same content rectangle. Calculate the
      // dimensions once here and provide them to tab components that need
      // them, after removing the title and tab-header heights.
      const width_px = this.state.rendered_width
      const height_px = tab_content_height
      switch (tab_index) {
         case 0:
            return <TestBenchmarks width_px={width_px} height_px={height_px}/>
         case 1:
            return <TestAnimation width_px={width_px} height_px={height_px}/>
         default:
            console.error('Unhandled tiles test tab', tab_index)
            return null
      }
   }
   
   render() {
      const {rendered_height, container_ref, tab_index} = this.state
      const top = container_ref.current?.getBoundingClientRect().top || TITLE_BAR_HEIGHT_PX
      const available_height = Math.max(0, rendered_height - top)
      const tab_content_height = Math.max(0, available_height - TAB_HEADER_HEIGHT_PX)
      return [
         <styles.SectionTitle key={'test-harness-title'}>
            {AppText.get(KEY_TILES_TEST_HARNESS)}
         </styles.SectionTitle>,
         <CoolStyles.Block
            key={'test-harness-tabs'}
            ref={container_ref}
            style={{
               height: `${available_height}px`,
               position: 'relative',
               overflow: 'hidden',
            }}>
            <CoolTabs
               labels={[AppText.get(KEY_TILES_TEST_BENCHMARKS), AppText.get(KEY_TILES_TEST_ANIMATION)]}
               tab_index={tab_index}
               on_tab_select={this.on_tab_select}
               selected_content={this.render_test_tab(tab_index, tab_content_height)}
            />
         </CoolStyles.Block>,
      ]
   }
}

export default TilesTest
