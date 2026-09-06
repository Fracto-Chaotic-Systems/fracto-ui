import React, { Component } from "react";
import {
  CELL_ALIGN_CENTER,
  CELL_ALIGN_LEFT,
  CELL_TYPE_NUMBER,
  CELL_TYPE_TEXT,
  TABLE_NO_HEADER,
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import PropTypes from "prop-types";
import CoolTable from "../../../utils/ui/CoolTable.jsx";

const TABLE_COLUMNS = [
  {
    id: "step",
    label: "step",
    type: CELL_TYPE_NUMBER,
    width_px: 35,
    align: CELL_ALIGN_CENTER,
  },
  {
    id: "x",
    label: "re",
    type: CELL_TYPE_TEXT,
    width_px: 200,
    align: CELL_ALIGN_LEFT,
  },
  {
    id: "y",
    label: "im",
    type: CELL_TYPE_TEXT,
    width_px: 200,
    align: CELL_ALIGN_LEFT,
  },
];

export class PointsSeriesTable extends Component {
  static propTypes = {
    table_data: PropTypes.array.isRequired,
  };

  render() {
    const { table_data } = this.props;
    return (
      <CoolTable
        columns={TABLE_COLUMNS}
        data={table_data}
        options={[TABLE_NO_HEADER]}
      />
    );
  }
}

export default PointsSeriesTable;
