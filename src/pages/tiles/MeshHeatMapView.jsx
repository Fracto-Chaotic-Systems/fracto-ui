import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import AppText from "../../AppText.jsx";
import { MESH_MAP_TEXT } from "../../text/TilesText.jsx";
import FractoColors from "@fracto/sdk/FractoColors.js";

const Panel = styled.div`
  padding: 0.5rem;
  text-align: left;
  canvas {
    display: block;
    max-width: 100%;
    border: 1px solid #666;
    border-radius: 0.25rem;
  }
  table {
    border-collapse: collapse;
    margin-top: 0.5rem;
  }
  th,
  td {
    padding: 0.25rem 0.75rem;
    text-align: right;
  }
  td {
    font-family: monospace;
  }
  label,
  button {
    cursor: pointer;
  }
`;

export default function MeshHeatMapView({
  canvas_ref,
  params,
  result,
  loading,
  error,
  selected_levels,
  on_retry,
  on_select_level,
  on_select_all,
}) {
  const selected =
    selected_levels ?? result?.coverage.map((row) => row.level) ?? [];
  const colors = result
    ? FractoColors.get_heat_map_greys_map(result.heat_map_buffer)
    : {};
  return (
    <Panel>
      <h3>{AppText.get(MESH_MAP_TEXT.title)}</h3>
      {(loading || error || !params || result?.coverage.length === 0) && (
        <p role="status">
          {AppText.get(
            MESH_MAP_TEXT[
              error
                ? "error"
                : loading
                  ? "loading"
                  : !params
                    ? "waiting"
                    : "empty"
            ],
          )}
          {error && (
            <button type="button" onClick={on_retry}>
              {AppText.get(MESH_MAP_TEXT.retry)}
            </button>
          )}
        </p>
      )}
      <canvas
        ref={canvas_ref}
        width={result?.width_px || params?.width_px || 1}
        height={
          result?.height_px ||
          (params ? Math.round(params.width_px * params.aspect_ratio) : 1)
        }
        aria-label={AppText.get(MESH_MAP_TEXT.title)}
      />
      {Boolean(result?.coverage.length) && (
        <>
          <label>
            <input
              type="checkbox"
              checked={result.coverage.every((row) =>
                selected.includes(row.level),
              )}
              onChange={(event) => on_select_all(event.target.checked)}
            />
            {AppText.get(MESH_MAP_TEXT.all)}
          </label>
          <table>
            <thead>
              <tr>
                {["level", "meshes", "coverage"].map((key) => (
                  <th key={key}>{AppText.get(MESH_MAP_TEXT[key])}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.coverage.map((row) => {
                const grey = colors[`_${row.level}`];
                return (
                  <tr key={row.level}>
                    <td>
                      <label>
                        <input
                          type="checkbox"
                          checked={selected.includes(row.level)}
                          onChange={() => on_select_level(row.level)}
                        />
                        <span
                          aria-hidden="true"
                          style={{
                            backgroundColor:
                              grey === undefined
                                ? "#d9ffff"
                                : `rgb(${grey},${grey},${grey})`,
                            display: "inline-block",
                            width: "0.75rem",
                            height: "0.75rem",
                            marginRight: "0.3rem",
                          }}
                        />
                        {row.level}
                      </label>
                    </td>
                    <td>{row.mesh_count}</td>
                    <td>
                      {(
                        (100 * row.pixel_count) /
                        (result.width_px * result.height_px)
                      ).toFixed(1)}
                      %
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </Panel>
  );
}

MeshHeatMapView.propTypes = {
  canvas_ref: PropTypes.object.isRequired,
  params: PropTypes.object,
  result: PropTypes.object,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.bool.isRequired,
  selected_levels: PropTypes.array,
  on_retry: PropTypes.func.isRequired,
  on_select_level: PropTypes.func.isRequired,
  on_select_all: PropTypes.func.isRequired,
};
