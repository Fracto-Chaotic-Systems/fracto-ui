import React from "react";
import PropTypes from "prop-types";
import { render_pattern_block } from "../StudyUtils.jsx";
import AppText from "../../../AppText.jsx";
import { MINIBROT_RAY_TEXT } from "../../../text/StudyText.jsx";

const cell_style = {
  padding: "0.5rem 0.75rem",
  textAlign: "left",
  verticalAlign: "top",
  borderBottom: "1px solid #ccc",
};

/** Fractions come directly from the paths used by the canvas overlay. */
export default function MinibrotRayTable({
  period,
  groups = {},
  selected_relative = "antenna_tip",
  on_select,
}) {
  return (
    <table style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th scope="col" style={cell_style}>
            {AppText.get(MINIBROT_RAY_TEXT.relative_angle)}
          </th>
          <th scope="col" style={cell_style}>
            {AppText.get(MINIBROT_RAY_TEXT.pattern)}
          </th>
          <th scope="col" style={cell_style}>
            {AppText.get(MINIBROT_RAY_TEXT.absolute_angles)}
          </th>
        </tr>
      </thead>
      <tbody>
        {["antenna_tip", "1/2", "1/3", "2/3", "0/1"].map((relative) => {
          const group = groups[relative];
          return (
            <tr
              key={relative}
              aria-selected={selected_relative === relative}
              tabIndex={0}
              onClick={() => on_select(relative)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  on_select(relative);
                }
              }}
              style={{
                cursor: "pointer",
                background:
                  selected_relative === relative ? "#dceafa" : undefined,
              }}
            >
              <th
                scope="row"
                style={{
                  ...cell_style,
                  fontFamily: "monospace",
                  whiteSpace: "normal",
                }}
              >
                {relative === "antenna_tip"
                  ? AppText.get(MINIBROT_RAY_TEXT.tip_label)
                  : relative}
              </th>
              <td style={cell_style}>
                {relative === "antenna_tip"
                  ? AppText.get(MINIBROT_RAY_TEXT.no_pattern)
                  : render_pattern_block(
                      period * Number(relative.split("/")[1]),
                    )}
              </td>
              <td style={cell_style}>
                {group?.rays?.length
                  ? group.rays.map((ray) => (
                      <div
                        key={ray.angle.key}
                        style={{ fontFamily: "monospace" }}
                      >
                        {ray.angle.key}
                      </div>
                    ))
                  : AppText.get(MINIBROT_RAY_TEXT.angles_pending)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

MinibrotRayTable.propTypes = {
  period: PropTypes.number.isRequired,
  groups: PropTypes.object,
  selected_relative: PropTypes.string,
  on_select: PropTypes.func.isRequired,
};
