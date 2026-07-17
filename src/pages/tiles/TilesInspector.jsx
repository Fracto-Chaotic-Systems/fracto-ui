import React, {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import {
   CELL_ALIGN_LEFT,
   CELL_ALIGN_RIGHT,
   CELL_TYPE_CALLBACK,
   CELL_TYPE_TEXT_KEY
} from "../../utils/ui/styles/CoolTableStyles.jsx";

const TABLE_COLUMNS = [
   {
      id: "name",
      label: "name",
      type: CELL_TYPE_TEXT_KEY,
      width_px: 35,
      style: {fontWeight: 'bold', color: '#666666', fontStyle: 'italic'},
      align: CELL_ALIGN_RIGHT,
   },
   {
      id: "value",
      label: "value",
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_LEFT,
   },
]

export class TilesInspector extends Component {
   state = {
   }

   render() {
      return 'TilesInspector'
   }
}

export default TilesInspector
