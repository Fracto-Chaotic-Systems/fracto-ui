import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import CoolButton from "../../utils/ui/CoolButton.jsx";
import AppText from "../../AppText.jsx";
import { MESH_OPERATION_TEXT as TEXT } from "../../text/TilesText.jsx";
const MeshTilePreview = React.lazy(() => import("./MeshTilePreview.jsx"));

const Block = styled.section`
  margin: 0.5rem;
  padding: 10px;
  max-width: 40rem;
  border-top: 1px double #888;
  text-align: left;
  h3 {
    margin: 0 0 0.75rem;
    text-align: center;
    font-style: italic;
    font-weight: normal;
    font-size: 1rem;
    color: #666;
  }
  progress {
    display: block;
    width: 100%;
    height: 10px;
    margin: 0.75rem 0;
  }
  output {
    font-family: monospace;
  }
`;
export default function MeshTransformOperationsView({
  selection,
  job,
  starting,
  stopping,
  saved_before,
  error_key,
  operator,
  on_start,
  on_stop,
  on_close,
}) {
  const active =
    starting ||
    stopping ||
    ["queued", "running", "stopping"].includes(job?.status);
  const saved = saved_before + (job?.created || 0) + (job?.reused || 0);
  const processed = Math.min(
    selection.count,
    saved_before + (job?.processed || 0),
  );
  const status = stopping
    ? "stopping"
    : starting
      ? "queued"
      : job?.status || "ready";
  const title = AppText.get(TEXT.title)
    .replace("{count}", String(selection.count))
    .replace("{level}", String(selection.level));
  return (
    <Block aria-label={title}>
      <h3>{title}</h3>
      {(active || job) && (
        <React.Suspense fallback={null}>
          <MeshTilePreview
            short_code={job?.preview_short_code}
            scope={selection.region.scope}
          />
        </React.Suspense>
      )}
      <p role="status">{AppText.get(TEXT[status])}</p>
      <progress
        max={selection.count}
        value={starting ? undefined : processed}
        aria-label={title}
      />
      <p>
        <output>
          {processed} / {selection.count}
        </output>
        {` · ${AppText.get(TEXT.saved)}: ${saved} · ${AppText.get(TEXT.failed_count)}: ${job?.failed || 0}`}
      </p>
      {job?.short_code && (
        <p>
          {AppText.get(TEXT.last_tile)}: <output>{job.short_code}</output>
        </p>
      )}
      {error_key && <p role="alert">{AppText.get(TEXT[error_key])}</p>}
      {!operator && <p>{AppText.get(TEXT.operator)}</p>}
      <CoolButton
        content={AppText.get(saved > 0 || job ? TEXT.resume : TEXT.start)}
        primary
        on_click={on_start}
        disabled={
          active ||
          !operator ||
          saved >= selection.count ||
          ["changed", "lost"].includes(error_key)
        }
      />
      <CoolButton
        content={AppText.get(TEXT.stop)}
        on_click={on_stop}
        disabled={!active || !job?.id || stopping}
      />
      <CoolButton
        content={AppText.get(TEXT.close)}
        on_click={on_close}
        disabled={active}
      />
    </Block>
  );
}
MeshTransformOperationsView.propTypes = {
  selection: PropTypes.object.isRequired,
  job: PropTypes.object,
  starting: PropTypes.bool.isRequired,
  stopping: PropTypes.bool.isRequired,
  saved_before: PropTypes.number.isRequired,
  error_key: PropTypes.string,
  operator: PropTypes.bool.isRequired,
  on_start: PropTypes.func.isRequired,
  on_stop: PropTypes.func.isRequired,
  on_close: PropTypes.func.isRequired,
};
