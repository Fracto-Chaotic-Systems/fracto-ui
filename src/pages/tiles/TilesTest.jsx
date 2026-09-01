import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import {KEY_TILES_TEST_HARNESS} from "../../text/TilesText.jsx";
import TilesBackend from "../../backend/TilesBackend.jsx";

export class TilesTest extends Component {
   state = {
      benchmark_results: null,
      benchmark_error: null,
   }

   componentDidMount() {
      TilesBackend.benchmark_results()
         .then(benchmark_results => this.setState({benchmark_results}))
         .catch(benchmark_error => {
            console.error('benchmark results fetch error', benchmark_error)
            this.setState({benchmark_error})
         })
   }

   render() {
      const {benchmark_results, benchmark_error} = this.state
      return [
         <styles.SectionTitle key={'test-harness-title'}>
            {AppText.get(KEY_TILES_TEST_HARNESS)}
         </styles.SectionTitle>,
         benchmark_error
            ? <pre key={'test-harness-error'}>{JSON.stringify({error: benchmark_error.message || `${benchmark_error}`}, null, 2)}</pre>
            : benchmark_results && <pre key={'test-harness-results'}>{JSON.stringify(benchmark_results, null, 2)}</pre>,
      ]
   }
}

export default TilesTest
