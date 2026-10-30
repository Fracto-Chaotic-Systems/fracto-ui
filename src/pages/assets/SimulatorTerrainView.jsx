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
  TerrainViewport,
  TerrainFlightReadings,
  TerrainBoundaryNotice,
} from "./SimulatorTerrainStyles.jsx";

const format = (key, values) =>
  Object.entries(values).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    AppText.get(TEXT[key]),
  );
const units = (value) => Number(value).toPrecision(4);

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
  navigation_mode,
  on_navigation_mode,
  flight_throttle,
  flight_sensitivity,
  flight_paused,
  on_throttle,
  on_sensitivity,
  on_flight_pause,
  flight_instruments,
  flight_readings,
  on_flight_instruments,
  flight_boundary,
  flight_start_ready,
  on_return_to_start,
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
          <label>
            {AppText.get(TEXT.navigation_mode)}
            <select value={navigation_mode} onChange={on_navigation_mode}>
              <option value="inspect">{AppText.get(TEXT.inspect)}</option>
              <option value="fly">{AppText.get(TEXT.fly)}</option>
            </select>
          </label>
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
        {navigation_mode === "fly" && (
          <TerrainToolbar>
            <label>
              <input
                type="checkbox"
                checked={flight_instruments}
                onChange={on_flight_instruments}
              />
              {AppText.get(TEXT.flight_instruments)}
            </label>
            <label>
              {AppText.get(TEXT.throttle)}
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={flight_throttle * 100}
                onChange={on_throttle}
              />
              <output>{Math.round(flight_throttle * 100)}%</output>
            </label>
            <label>
              {AppText.get(TEXT.sensitivity)}
              <input
                type="range"
                min="0.25"
                max="2"
                step="0.05"
                value={flight_sensitivity}
                onChange={on_sensitivity}
              />
              <output>{flight_sensitivity.toFixed(2)}×</output>
            </label>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={on_flight_pause}
            >
              {AppText.get(
                TEXT[flight_paused ? "resume_flight" : "pause_flight"],
              )}
            </button>
            <span role="status">
              {AppText.get(
                TEXT[flight_paused ? "flight_paused" : "flight_running"],
              )}
            </span>
            <button
              type="button"
              disabled={!flight_start_ready}
              onClick={on_return_to_start}
            >
              {AppText.get(TEXT.return_to_start)}
            </button>
          </TerrainToolbar>
        )}
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
        <TerrainMessage>
          {AppText.get(TEXT[navigation_mode === "fly" ? "fly_help" : "help"])}
        </TerrainMessage>
      </TerrainOptions>
      <TerrainViewport>
        <TerrainHost ref={host} />
        {navigation_mode === "fly" && flight_boundary && (
          <TerrainBoundaryNotice role="status">
            {AppText.get(
              TEXT[flight_boundary === "edge" ? "region_edge" : "region_near"],
            )}
            <button
              type="button"
              disabled={!flight_start_ready}
              onClick={on_return_to_start}
            >
              {AppText.get(TEXT.return_to_start)}
            </button>
          </TerrainBoundaryNotice>
        )}
        {navigation_mode === "fly" && flight_instruments && flight_readings && (
          <TerrainFlightReadings>
            <div>
              {AppText.get(TEXT.throttle)}: {Math.round(flight_throttle * 100)}%
            </div>
            <div>
              {AppText.get(TEXT.flight_speed)}:{" "}
              {units(flight_readings.speed_units)}{" "}
              {AppText.get(TEXT.units_per_second)} (
              {flight_readings.speed_scopes.toFixed(3)}{" "}
              {AppText.get(TEXT.scopes_per_second)})
            </div>
            <div>
              {AppText.get(TEXT.plane_altitude)}:{" "}
              {units(flight_readings.altitude)}
            </div>
            <div>
              {AppText.get(TEXT.terrain_clearance)}:{" "}
              {flight_readings.clearance === null
                ? AppText.get(TEXT.no_surface)
                : units(flight_readings.clearance)}
            </div>
            <div>{AppText.get(TEXT.flight_units_help)}</div>
          </TerrainFlightReadings>
        )}
      </TerrainViewport>
    </TerrainPanel>
  );
}
SimulatorTerrainView.propTypes = {
  flight_boundary: PropTypes.oneOf(["near", "edge"]),
  flight_start_ready: PropTypes.bool.isRequired,
  on_return_to_start: PropTypes.func.isRequired,
  flight_instruments: PropTypes.bool.isRequired,
  flight_readings: PropTypes.object,
  on_flight_instruments: PropTypes.func.isRequired,
  flight_throttle: PropTypes.number.isRequired,
  flight_sensitivity: PropTypes.number.isRequired,
  flight_paused: PropTypes.bool.isRequired,
  on_throttle: PropTypes.func.isRequired,
  on_sensitivity: PropTypes.func.isRequired,
  on_flight_pause: PropTypes.func.isRequired,
  navigation_mode: PropTypes.oneOf(["inspect", "fly"]).isRequired,
  on_navigation_mode: PropTypes.func.isRequired,
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
