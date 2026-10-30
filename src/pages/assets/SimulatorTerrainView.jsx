import React, { useId, useState } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faXmark } from "@fortawesome/free-solid-svg-icons";
import AppText from "../../AppText.jsx";
import { TERRAIN_TEXT as TEXT } from "../../text/AssetsText.jsx";
import SimulatorTerrainLightingControls from "./SimulatorTerrainLightingControls.jsx";
import {
  TerrainPanel,
  TerrainToolbar,
  TerrainHost,
  TerrainMessage,
  TerrainProgress,
  TerrainOptions,
  TerrainOptionsToggle,
} from "./SimulatorTerrainStyles.jsx";

const format = (key, values) =>
  Object.entries(values).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    AppText.get(TEXT[key]),
  );

export default function SimulatorTerrainView({
  resolution_input,
  lighting,
  wireframe,
  status,
  loaded_info,
  progress,
  detail_loading = false,
  host,
  on_resolution_change,
  on_resolution_apply,
  on_view,
  on_wireframe,
  on_reload,
  on_lighting,
}) {
  const [options_open, set_options_open] = useState(false);
  const options_id = useId();
  const plan = loaded_info?.plan;
  const missing =
    (plan?.missing_count || 0) + (loaded_info?.failures.length || 0);
  return (
    <TerrainPanel>
      <TerrainOptionsToggle
        type="button"
        aria-label={AppText.get(
          TEXT[options_open ? "close_options" : "open_options"],
        )}
        title={AppText.get(
          TEXT[options_open ? "close_options" : "open_options"],
        )}
        aria-expanded={options_open}
        aria-controls={options_id}
        onClick={() => set_options_open((open) => !open)}
      >
        <FontAwesomeIcon icon={options_open ? faXmark : faGear} />
      </TerrainOptionsToggle>
      <TerrainOptions id={options_id} hidden={!options_open}>
        <TerrainToolbar>
          <form onSubmit={on_resolution_apply}>
            <label>
              {AppText.get(TEXT.resolution)}
              <input
                type="number"
                min="2"
                max="5000"
                step="1"
                required
                value={resolution_input}
                onChange={on_resolution_change}
                style={{ width: "6rem" }}
              />
            </label>
            <button type="submit">{AppText.get(TEXT.apply)}</button>
          </form>
          <button onClick={() => on_view("top")}>
            {AppText.get(TEXT.top)}
          </button>
          <button onClick={() => on_view("oblique")}>
            {AppText.get(TEXT.reset)}
          </button>
          <label>
            <input
              type="checkbox"
              checked={wireframe}
              onChange={on_wireframe}
            />
            {AppText.get(TEXT.wireframe)}
          </label>
          <button onClick={on_reload}>{AppText.get(TEXT.reload)}</button>
        </TerrainToolbar>
        <SimulatorTerrainLightingControls
          settings={lighting}
          on_change={on_lighting}
        />
        <TerrainMessage aria-live="polite">
          {AppText.get(TEXT[status])}
          {plan?.level && (
            <div>
              {format("cached_summary", {
                level: plan.level,
                x: plan.native_resolution.x,
                y: plan.native_resolution.y,
                loaded: loaded_info.items.length,
                total: plan.tiles.length,
                ms: loaded_info.elapsed_ms,
                reused: loaded_info.cache_hits,
              })}
            </div>
          )}
          {plan?.level && (
            <div>
              {format("lod_summary", {
                level: plan.detail_level ?? plan.level,
                count: plan.refined_groups?.length || 0,
                status: AppText.get(
                  TEXT[
                    detail_loading
                      ? "detail_loading"
                      : loaded_info.detail_failures?.length
                        ? "detail_fallback"
                        : "detail_ready"
                  ],
                ),
              })}
            </div>
          )}
          {plan?.level && !plan.minimum_met && (
            <div>
              {format(
                plan.limiting_reason === "mesh_budget"
                  ? "budget_limited"
                  : "below_minimum",
                {
                  minimum: plan.minimum_resolution,
                  limit: plan.mesh_limit,
                },
              )}
            </div>
          )}
          {missing > 0 && (
            <div>{format("missing_meshes", { count: missing })}</div>
          )}
        </TerrainMessage>
        {progress && (
          <TerrainProgress>
            <span>
              {AppText.get(TEXT[`progress_${progress.stage}`])}
              {progress.total !== undefined &&
                ` · ${progress.completed} / ${progress.total}`}
              {progress.value !== null && ` · ${progress.value}%`}
            </span>
            <progress
              max="100"
              value={progress.value ?? undefined}
              aria-label={AppText.get(TEXT[`progress_${progress.stage}`])}
            />
          </TerrainProgress>
        )}
        <TerrainMessage>{AppText.get(TEXT.help)}</TerrainMessage>
      </TerrainOptions>
      <TerrainHost ref={host} />
    </TerrainPanel>
  );
}
SimulatorTerrainView.propTypes = {
  resolution_input: PropTypes.string.isRequired,
  lighting: PropTypes.object.isRequired,
  wireframe: PropTypes.bool.isRequired,
  status: PropTypes.string.isRequired,
  loaded_info: PropTypes.object,
  progress: PropTypes.object,
  detail_loading: PropTypes.bool,
  host: PropTypes.object.isRequired,
  on_resolution_change: PropTypes.func.isRequired,
  on_resolution_apply: PropTypes.func.isRequired,
  on_view: PropTypes.func.isRequired,
  on_wireframe: PropTypes.func.isRequired,
  on_reload: PropTypes.func.isRequired,
  on_lighting: PropTypes.func.isRequired,
};
