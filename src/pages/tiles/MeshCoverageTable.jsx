import React from "react";
import PropTypes from "prop-types";
import CoolTable from "../../utils/ui/CoolTable.jsx";
import {
  CELL_ALIGN_CENTER,
  CELL_TYPE_CALLBACK,
  CELL_TYPE_NUMBER,
} from "../../utils/ui/styles/CoolTableStyles.jsx";
import FractoColors from "@fracto/sdk/FractoColors.js";
import { MESH_MAP_TEXT } from "../../text/TilesText.jsx";
import { render_level_color } from "../assets/AssetsUtils.jsx";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";

const COLUMNS = [
  {
    id: "color",
    label_key: MESH_MAP_TEXT.shade,
    type: CELL_TYPE_CALLBACK,
    width_px: 60,
    align: CELL_ALIGN_CENTER,
  },
  ...[
    ["level", 40],
    ["tile_count", 80],
    ["mesh_count", 90],
    ["can_do", 80],
  ].map(([id, width_px]) => ({
    id,
    label_key: MESH_MAP_TEXT[id],
    type: CELL_TYPE_NUMBER,
    width_px,
    align: CELL_ALIGN_CENTER,
  })),
];

export function mesh_coverage_rows(result) {
  const colors = FractoColors.get_heat_map_greys_map(result.heat_map_buffer);
  const rows = result.coverage
    .slice()
    .sort((a, b) => a.level - b.level)
    .map((row) => {
      const grey = colors[`_${row.level}`];
      return {
        color: [
          render_level_color,
          grey === undefined ? "#d9ffff" : `rgb(${grey},${grey},${grey})`,
        ],
        level: row.level,
        tile_count: row.tile_count ?? null,
        mesh_count: row.mesh_count,
        can_do:
          row.tile_count === undefined ? null : row.tile_count - row.mesh_count,
      };
    });
  const cutoff = rows.findIndex((row) => row.can_do > 50000);
  return cutoff < 0 ? rows : rows.slice(0, cutoff + 1);
}

export default function MeshCoverageTable({
  result,
  on_transform,
  disabled = false,
}) {
  const rows = mesh_coverage_rows(result);
  const data = rows.map((row) => ({
    ...row,
    can_do:
      row.can_do > 0 && !disabled ? (
        <CoolStyles.LinkSpan
          as="button"
          type="button"
          style={{
            border: 0,
            background: "transparent",
            padding: 0,
            font: "inherit",
          }}
          onClick={(event) => {
            event.stopPropagation();
            on_transform({ count: row.can_do, level: row.level });
          }}
        >
          {row.can_do}
        </CoolStyles.LinkSpan>
      ) : (
        row.can_do
      ),
  }));
  return <CoolTable columns={COLUMNS} data={data} />;
}
MeshCoverageTable.propTypes = {
  result: PropTypes.object.isRequired,
  on_transform: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};
