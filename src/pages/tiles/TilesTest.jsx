import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import {KEY_TILES_TEST_HARNESS} from "../../text/TilesText.jsx";

export class TilesTest extends Component {
   render() {
      return <styles.SectionTitle>
         {AppText.get(KEY_TILES_TEST_HARNESS)}
      </styles.SectionTitle>
   }
}

export default TilesTest
