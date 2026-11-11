import React, { useMemo } from "react";
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import {
  CELL_TYPE_CALLBACK,
  CELL_ALIGN_CENTER,
  CELL_ALIGN_LEFT,
  TABLE_NO_BORDER,
  TABLE_NO_HEADER,
  TABLE_CAN_SELECT,
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import { format_orbital_point } from "./PointsOrbitalPointFormat.js";

const COLUMNS = [
  { id: "ratios", label: "Ratios", type: CELL_TYPE_CALLBACK, align: CELL_ALIGN_CENTER, style: { padding: "4px 12px" } },
  { id: "real", label: "Real", type: CELL_TYPE_CALLBACK, align: CELL_ALIGN_LEFT, style: { padding: "4px 12px" } },
  { id: "imaginary", label: "Imaginary", type: CELL_TYPE_CALLBACK, align: CELL_ALIGN_LEFT, style: { padding: "4px 12px" } },
];
const EMPTY_POINTS = [];
const render_point = (text) => <code style={{ whiteSpace: "nowrap" }}>{text}</code>;
const render_coordinate = (text, width) => (
  <code style={{ display: "inline-block", width: `${width}ch`, textAlign: "right", whiteSpace: "nowrap" }}>
    {text}
  </code>
);

export default function PointsOrbitalPointList({ selected_orbital, active_point_index, on_select_point }) {
  const points = selected_orbital?.points || EMPTY_POINTS;
  const data = useMemo(() => {
    const formatted = points.map(format_orbital_point);
    const real_width = Math.max(0, ...formatted.map(({ real }) => real.length));
    const imaginary_width = Math.max(0, ...formatted.map(({ imaginary }) => imaginary.length));
    return formatted.map(({ ratios, real, imaginary }) => ({
      ratios: [render_point, ratios],
      real: [(text) => render_coordinate(text, real_width), real],
      imaginary: [(text) => render_coordinate(text, imaginary_width), imaginary],
    }));
  }, [points]);
  if (!points.length) return null;
  return (
    <div style={{ padding: "0.5rem", width: "max-content", minWidth: "100%", boxSizing: "border-box" }}>
      <CoolTable
        columns={COLUMNS}
        data={data}
        options={[TABLE_NO_BORDER, TABLE_NO_HEADER, TABLE_CAN_SELECT]}
        on_select_row={(row) => {
          const point = points[row];
          if (point) on_select_point?.(point.point_index);
        }}
        selected_row={points.findIndex((point) => point.point_index === active_point_index)}
        scroll_selected_row
      />
    </div>
  );
}
