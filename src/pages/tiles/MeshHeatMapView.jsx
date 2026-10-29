import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import AppText from "../../AppText.jsx";
import { MESH_MAP_TEXT } from "../../text/TilesText.jsx";
import MeshCoverageTable from "./MeshCoverageTable.jsx";
import MeshTransformOperations from "./MeshTransformOperations.jsx";

const Panel = styled.div`
  padding: 0.5rem;
  text-align: left;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  canvas {
    display: block;
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #666;
    border-radius: 0.25rem;
  }
  label,
  button {
    cursor: pointer;
  }
`;
const MapColumn = styled.div`
  flex: 0 0 auto;
`;
const MapArea = styled.div`
  max-width: 100%;
  progress {
    display: block;
    width: 100%;
    height: 10px;
    margin: 0.5rem 0;
  }
`;
const TableArea = styled.div`
  flex: 0 0 auto;
`;

export default function MeshHeatMapView({
  canvas_ref,
  params,
  result,
  loading,
  error,
  on_retry,
  operation,
  operation_busy,
  automation_mode,
  on_transform,
  on_operation_busy,
  on_operation_change,
  on_operation_close,
}) {
  const map_width = result?.width_px || params?.width_px || 1;
  const empty = result && !result.coverage.some((row) => row.mesh_count > 0);
  return (
    <>
      <Panel>
        <MapColumn style={{ width: map_width + 2 }}>
          <MapArea>
            <canvas
              ref={canvas_ref}
              width={map_width}
              height={
                result?.height_px ||
                (params ? Math.round(params.width_px * params.aspect_ratio) : 1)
              }
              aria-label={AppText.get(MESH_MAP_TEXT.title)}
            />
            {loading && (
              <progress aria-label={AppText.get(MESH_MAP_TEXT.loading)} />
            )}
          </MapArea>
          {!loading && (error || !params || empty) && (
            <p role="status">
              {AppText.get(
                MESH_MAP_TEXT[error ? "error" : !params ? "waiting" : "empty"],
              )}
              {error && (
                <button type="button" onClick={on_retry}>
                  {AppText.get(MESH_MAP_TEXT.retry)}
                </button>
              )}
            </p>
          )}
        </MapColumn>
        {Boolean(result?.coverage.length) && (
          <TableArea>
            <MeshCoverageTable
              result={result}
              on_transform={on_transform}
              disabled={operation_busy}
            />
          </TableArea>
        )}
      </Panel>
      {operation && (
        <MeshTransformOperations
          key={operation.id}
          selection={operation}
          automation_mode={automation_mode}
          on_busy_change={on_operation_busy}
          on_change={on_operation_change}
          on_close={on_operation_close}
        />
      )}
    </>
  );
}
MeshHeatMapView.propTypes = {
  canvas_ref: PropTypes.object.isRequired,
  params: PropTypes.object,
  result: PropTypes.object,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.bool.isRequired,
  on_retry: PropTypes.func.isRequired,
  operation: PropTypes.object,
  operation_busy: PropTypes.bool,
  automation_mode: PropTypes.string,
  on_transform: PropTypes.func.isRequired,
  on_operation_busy: PropTypes.func.isRequired,
  on_operation_change: PropTypes.func.isRequired,
  on_operation_close: PropTypes.func.isRequired,
};
