import React, { Component } from "react";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppSettings from "../../AppSettings.jsx";
import {
  KEY_ASSETS_SURVEYS_FRAME_SETTINGS,
  KEY_ASSETS_SURVEYS_SPLITTER_POS,
  KEY_ASSETS_SURVEYS_HALF_SPAN,
  KEY_ASSETS_SURVEYS_ITERATION_LIMIT,
  KEY_ASSETS_SPLITTER_POS_PX,
} from "../../settings/AssetsSettings.jsx";
import { ASSETS_SURVEYS_SPLITTER_KEYS } from "../../navigator/NavigatorKeys.jsx";
import { SPLITTER_WIDTH_PX } from "../../constants.jsx";
import AppText from "../../AppText.jsx";
import {
  KEY_ASSETS_SURVEYS,
  KEY_ASSETS_SURVEYS_FAILED,
  KEY_ASSETS_SURVEYS_PREVIEW,
  KEY_ASSETS_SURVEYS_RENDER,
  KEY_ASSETS_SURVEYS_SAMPLES,
  KEY_ASSETS_SURVEYS_LIMIT,
} from "../../text/AssetsText.jsx";
import NavigatorSplitterLayout from "../../navigator/NavigatorSplitterLayout.jsx";
import { update_dimensions } from "../PageUtils.jsx";
import DataBackend from "../../backend/DataBackend.jsx";
import SeedSurveyPreviewCanvas from "./SeedSurveyPreviewCanvas.jsx";

const UPDATE_INTERVAL_MS = 1000;
const HEADER_HEIGHT_PX = 35;
const MIN_NAVIGATOR_WIDTH_PX = 400;
const MIN_CONTENT_WIDTH_PX = 255;
const PREVIEW_RESOLUTION = 121;
const RENDER_RESOLUTION = 1024;
const DEFAULT_HALF_SPAN = 1.5;
const MIN_HALF_SPAN_EXPONENT = -11;
const MAX_HALF_SPAN_EXPONENT = 1;
const MIN_HALF_SPAN = 2 ** MIN_HALF_SPAN_EXPONENT;
const MAX_HALF_SPAN = 2 ** MAX_HALF_SPAN_EXPONENT;
const MIN_ITERATION_LIMIT_EXPONENT = 5;
const MAX_ITERATION_LIMIT_EXPONENT = 10;
const DEFAULT_ITERATION_LIMIT = 10 ** MIN_ITERATION_LIMIT_EXPONENT;
const OPTION_LABEL_STYLE = { display: "flex", alignItems: "center" };

const normalize_half_span = (value) => {
  const half_span = Number(value);
  return Number.isFinite(half_span) &&
    half_span >= MIN_HALF_SPAN &&
    half_span <= MAX_HALF_SPAN
    ? half_span
    : DEFAULT_HALF_SPAN;
};

const normalize_iteration_limit = (value) => {
  const iteration_limit = Number(value);
  return Number.isFinite(iteration_limit) &&
    iteration_limit >= DEFAULT_ITERATION_LIMIT &&
    iteration_limit <= 10 ** MAX_ITERATION_LIMIT_EXPONENT
    ? Math.floor(iteration_limit)
    : DEFAULT_ITERATION_LIMIT;
};

const format_iteration_limit = (iteration_limit) => {
  const divisor = iteration_limit >= 1_000_000_000
    ? 1_000_000_000
    : iteration_limit >= 1_000_000
      ? 1_000_000
      : 1_000;
  const suffix = divisor === 1_000_000_000
    ? "G"
    : divisor === 1_000_000
      ? "M"
      : "K";
  return `${Number((iteration_limit / divisor).toPrecision(3))}${suffix}`;
};

/** Seed-plane preview page with a persistent navigator and preview pane. */
export class AssetsSurveys extends Component {
  state = {
    rendered_width: 0,
    rendered_height: 0,
    content_splitter_pos: 0,
    frame_settings: {},
    mode: "preview",
    half_span: DEFAULT_HALF_SPAN,
    iteration_limit: DEFAULT_ITERATION_LIMIT,
    seed_survey: {
      status: "idle",
      total_samples: 0,
      stable_count: 0,
      stable_points: [],
      iteration_points: [],
      unresolved_points: [],
      escaped_points: [],
      canvas_buffer_batch: null,
      uses_canvas_buffer: false,
      request_id: 0,
    },
    container_ref: React.createRef(),
    interval: null,
    subscription: null,
  };

  componentDidMount() {
    this.is_mounted = true;
    this.update_dimensions();
    const frame_settings = AppSettings.get(KEY_ASSETS_SURVEYS_FRAME_SETTINGS);
    const half_span = normalize_half_span(
      AppSettings.get(KEY_ASSETS_SURVEYS_HALF_SPAN),
    );
    const iteration_limit = normalize_iteration_limit(
      AppSettings.get(KEY_ASSETS_SURVEYS_ITERATION_LIMIT),
    );
    this.setState({
      frame_settings,
      half_span,
      iteration_limit,
      content_splitter_pos: AppSettings.get(KEY_ASSETS_SURVEYS_SPLITTER_POS),
      interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
      subscription: AppSettings.subscribe(
        KEY_ASSETS_SURVEYS_FRAME_SETTINGS,
        this.on_frame_settings_changed,
      ),
      splitter_subscription: AppSettings.subscribe(
        KEY_ASSETS_SURVEYS_SPLITTER_POS,
        this.on_navigator_splitter_changed,
      ),
    }, () => this.request_seed_survey(
      frame_settings,
      PREVIEW_RESOLUTION,
      half_span,
      iteration_limit,
    ));
  }

  componentWillUnmount() {
    this.is_mounted = false;
    this.seed_survey_request_id = (this.seed_survey_request_id || 0) + 1;
    if (this.seed_survey_poll_timer) clearTimeout(this.seed_survey_poll_timer);
    const { interval, subscription, splitter_subscription } = this.state;
    if (interval) clearInterval(interval);
    if (subscription) AppSettings.unsubscribe(subscription);
    if (splitter_subscription) AppSettings.unsubscribe(splitter_subscription);
  }

  update_dimensions = () => {
    const { rendered_width, rendered_height } = this.state;
    const new_values = update_dimensions(
      rendered_width,
      rendered_height,
      KEY_ASSETS_SPLITTER_POS_PX,
    );
    if (new_values) this.setState(new_values);
  };

  on_frame_settings_changed = (key, value) => {
    this.setState({ frame_settings: value });
    const focal_point = value?.focal_point;
    if (
      !focal_point ||
      !Number.isFinite(focal_point.x) ||
      !Number.isFinite(focal_point.y)
    ) return;
    const focal_key = `${focal_point.x},${focal_point.y}`;
    if (focal_key === this.last_survey_focal_key) return;
    this.request_seed_survey(
      value,
      this.state.mode === "render" ? RENDER_RESOLUTION : PREVIEW_RESOLUTION,
      this.state.half_span,
      this.state.iteration_limit,
    );
  };

  request_seed_survey = (
    frame_settings,
    resolution = PREVIEW_RESOLUTION,
    half_span = this.state.half_span,
    iteration_limit = this.state.iteration_limit,
  ) => {
    const focal_point = frame_settings?.focal_point;
    if (
      !focal_point ||
      !Number.isFinite(focal_point.x) ||
      !Number.isFinite(focal_point.y)
    ) return;
    const focal_key = `${focal_point.x},${focal_point.y}:${resolution}:${half_span}:${iteration_limit}`;
    if (focal_key === this.last_survey_focal_key) return;
    this.last_survey_focal_key = focal_key;
    const request_id = (this.seed_survey_request_id || 0) + 1;
    this.seed_survey_request_id = request_id;
    if (this.seed_survey_poll_timer) {
      clearTimeout(this.seed_survey_poll_timer);
      this.seed_survey_poll_timer = null;
    }
    this.setState({
      seed_survey: {
        status: "queued",
        total_samples: 0,
        stable_count: 0,
        stable_points: [],
        iteration_points: [],
        unresolved_points: [],
        escaped_points: [],
        canvas_buffer_batch: null,
        uses_canvas_buffer: false,
        render_resolution: resolution === RENDER_RESOLUTION ? RENDER_RESOLUTION : null,
        render_rows_completed: 0,
        render_batch: null,
        request_id,
      },
    });
    DataBackend.start_seed_survey(
      focal_point,
      resolution,
      half_span,
      iteration_limit,
      (response) => {
        if (request_id !== this.seed_survey_request_id || !this.is_mounted) return;
        if (response.error) {
          this.setState((state) => ({
            seed_survey: { ...state.seed_survey, status: "failed", error: response.error },
          }));
          return;
        }
        const survey = response.result || {};
        this.setState({
          seed_survey: {
            status: survey.status || "queued",
            progress: survey.progress,
            total_samples: survey.total_samples || survey.progress?.total || 0,
            stable_count: survey.stable_count || 0,
            stable_points: survey.stable_points || [],
            iteration_points: survey.iteration_points || [],
            unresolved_points: survey.unresolved_points || [],
            escaped_points: survey.escaped_points || [],
            render_mode: survey.render_mode,
            render_resolution: survey.resolution === RENDER_RESOLUTION
              ? RENDER_RESOLUTION
              : null,
            render_rows_completed: survey.render_rows_completed || 0,
            render_batch: survey.render_batch || null,
            canvas_buffer_batch: survey.canvas_buffer_batch || null,
            uses_canvas_buffer: survey.uses_canvas_buffer || false,
            outside_main_cardioid: survey.outside_main_cardioid || false,
            half_span: survey.half_span ?? half_span,
            iteration_limit: survey.iteration_limit ?? iteration_limit,
            request_id,
          },
        });
        if (survey.job_id) this.poll_seed_survey(survey.job_id, request_id, 0);
      },
    );
  };

  poll_seed_survey = (job_id, request_id, after_row = 0) => {
    DataBackend.get_seed_survey_job(job_id, (job) => {
      if (request_id !== this.seed_survey_request_id || !this.is_mounted) return;
      if (job.error) {
        this.setState((state) => ({
          seed_survey: { ...state.seed_survey, status: "failed", error: job.error },
        }));
        return;
      }
      if (job.status === "completed") {
        const next_row = (job.render_batch?.row_start || 0) + (job.render_batch?.row_count || 0);
        this.setState((state) => ({
          seed_survey: {
            ...state.seed_survey,
            ...(job.result || {}),
            ...job,
            status: "completed",
          },
        }));
        if (!job.render_mode || next_row >= job.render_rows_completed) return;
        this.seed_survey_poll_timer = setTimeout(
          () => this.poll_seed_survey(job_id, request_id, next_row),
          0,
        );
        return;
      }
      if (job.status === "failed" || job.status === "cancelled") {
        this.setState((state) => ({
          seed_survey: {
            ...state.seed_survey,
            status: job.status,
            error: job.error,
          },
        }));
        return;
      }
      this.setState((state) => ({
        seed_survey: {
          ...state.seed_survey,
          status: job.status,
          progress: job.progress,
          total_samples: job.total_samples || job.progress?.total || state.seed_survey.total_samples,
          stable_count: job.stable_count ?? state.seed_survey.stable_count,
          stable_points: job.stable_points || state.seed_survey.stable_points,
          iteration_points: job.iteration_points || state.seed_survey.iteration_points,
          unresolved_points: job.unresolved_points || state.seed_survey.unresolved_points,
          escaped_points: job.escaped_points || state.seed_survey.escaped_points,
          render_mode: job.render_mode,
          render_resolution: job.resolution === RENDER_RESOLUTION
            ? RENDER_RESOLUTION
            : null,
          render_rows_completed: job.render_rows_completed || 0,
          render_batch: job.render_batch || null,
          canvas_buffer_batch: job.canvas_buffer_batch || null,
          uses_canvas_buffer: job.uses_canvas_buffer || false,
          outside_main_cardioid: job.outside_main_cardioid || false,
        },
      }));
      const batch = job.render_batch?.row_count
        ? job.render_batch
        : job.canvas_buffer_batch;
      const next_row = (batch?.row_start || 0) + (batch?.row_count || 0);
      const received_rows = batch?.row_count || 0;
      this.seed_survey_poll_timer = setTimeout(
        () => this.poll_seed_survey(
          job_id,
          request_id,
          received_rows ? next_row : after_row,
        ),
        1000,
      );
    }, after_row);
  };

  on_mode_change = (mode) => {
    this.setState({ mode }, () => this.request_seed_survey(
      this.state.frame_settings,
      mode === "render" ? RENDER_RESOLUTION : PREVIEW_RESOLUTION,
      this.state.half_span,
      this.state.iteration_limit,
    ));
  };

  on_half_span_change = (event) => {
    const exponent = Number(event.target.value);
    const half_span = 2 ** exponent;
    AppSettings.on_settings_changed({
      [KEY_ASSETS_SURVEYS_HALF_SPAN]: half_span,
    });
    this.setState({ half_span }, () => this.request_seed_survey(
      this.state.frame_settings,
      this.state.mode === "render" ? RENDER_RESOLUTION : PREVIEW_RESOLUTION,
      half_span,
      this.state.iteration_limit,
    ));
  };

  on_iteration_limit_change = (event) => {
    const exponent = Number(event.target.value);
    const iteration_limit = Math.round(10 ** exponent);
    AppSettings.on_settings_changed({
      [KEY_ASSETS_SURVEYS_ITERATION_LIMIT]: iteration_limit,
    });
    this.setState({ iteration_limit }, () => this.request_seed_survey(
      this.state.frame_settings,
      this.state.mode === "render" ? RENDER_RESOLUTION : PREVIEW_RESOLUTION,
      this.state.half_span,
      iteration_limit,
    ));
  };

  on_navigator_splitter_changed = (_key, position) =>
    this.setState({ content_splitter_pos: position });

  render() {
    const {
      container_ref,
      rendered_width,
      rendered_height,
      frame_settings,
      mode,
      half_span,
      iteration_limit,
      seed_survey,
      content_splitter_pos,
    } = this.state;
    let top = 0;
    let left = 0;
    if (container_ref.current) {
      const bounds = container_ref.current.getBoundingClientRect();
      top = bounds.top;
      left = bounds.left;
    }
    const bounding_rect = {
      top,
      left,
      width: rendered_width,
      height: rendered_height,
    };
    const max_navigator_width = Math.max(
      0,
      rendered_width - MIN_CONTENT_WIDTH_PX,
    );
    const min_navigator_width = Math.min(
      MIN_NAVIGATOR_WIDTH_PX,
      max_navigator_width,
    );
    const right_panel_left = content_splitter_pos + SPLITTER_WIDTH_PX / 2;
    const right_panel_width = Math.max(
      0,
      left + rendered_width - right_panel_left,
    );
    return [
      <styles.SectionTitle key="assets-surveys-title">
        {AppText.get(KEY_ASSETS_SURVEYS)}
      </styles.SectionTitle>,
      <div
        ref={container_ref}
        key="assets-surveys-layout"
        style={{
          width: `${rendered_width}px`,
          height: `${rendered_height}px`,
        }}
      >
        <NavigatorSplitterLayout
          bounding_rect={bounding_rect}
          frame_settings={frame_settings}
          frame_settings_key={KEY_ASSETS_SURVEYS_FRAME_SETTINGS}
          splitter_keys={ASSETS_SURVEYS_SPLITTER_KEYS}
          main_splitter_min_position={left + min_navigator_width}
          main_splitter_max_position={left + max_navigator_width}
        />
        <styles.FixedBlock
          style={{
            top,
            left: right_panel_left,
            width: right_panel_width,
            height: rendered_height,
            overflow: "hidden",
            backgroundColor: "#fcfcfc",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              width: "100%",
              height: `${HEADER_HEIGHT_PX}px`,
              minHeight: `${HEADER_HEIGHT_PX}px`,
              padding: "0 0.5rem",
              borderBottom: "1px solid #666666",
              boxSizing: "border-box",
            }}
          >
            <label style={{ ...OPTION_LABEL_STYLE, flex: "0 0 auto" }}>
              <input
                type="radio"
                name="assets-surveys-mode"
                checked={mode === "preview"}
                onChange={() => this.on_mode_change("preview")}
              />
              <span style={{ marginLeft: "0.35rem" }}>
                {AppText.get(KEY_ASSETS_SURVEYS_PREVIEW)}
              </span>
            </label>
            <label style={{ ...OPTION_LABEL_STYLE, flex: "0 0 auto" }}>
              <input
                type="radio"
                name="assets-surveys-mode"
                checked={mode === "render"}
                onChange={() => this.on_mode_change("render")}
              />
              <span style={{ marginLeft: "0.35rem" }}>
                {AppText.get(KEY_ASSETS_SURVEYS_RENDER)}
              </span>
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                marginLeft: "0.2rem",
                flex: "0 1 auto",
                minWidth: 0,
              }}
            >
              <span>{AppText.get(KEY_ASSETS_SURVEYS_HALF_SPAN)}</span>
              <input
                type="range"
                min={MIN_HALF_SPAN_EXPONENT}
                max={MAX_HALF_SPAN_EXPONENT}
                step="0.01"
                value={Math.log2(half_span)}
                onChange={this.on_half_span_change}
                aria-label={AppText.get(KEY_ASSETS_SURVEYS_HALF_SPAN)}
                aria-valuetext={half_span.toPrecision(5)}
                style={{ width: "10rem", minWidth: "2rem", flex: "1 1 5rem" }}
              />
              <span>{Number(half_span.toPrecision(5)).toString()}</span>
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                marginLeft: "0.15rem",
                flex: "0 1 auto",
                minWidth: 0,
              }}
            >
              <span>{AppText.get(KEY_ASSETS_SURVEYS_LIMIT)}</span>
              <input
                type="range"
                min={MIN_ITERATION_LIMIT_EXPONENT}
                max={MAX_ITERATION_LIMIT_EXPONENT}
                step="0.01"
                value={Math.log10(iteration_limit)}
                onChange={this.on_iteration_limit_change}
                aria-label={AppText.get(KEY_ASSETS_SURVEYS_LIMIT)}
                aria-valuetext={format_iteration_limit(iteration_limit)}
                style={{ width: "8rem", minWidth: "2rem", flex: "1 1 4rem" }}
              />
              <span>{format_iteration_limit(iteration_limit)}</span>
            </label>
          </div>
          <div
            style={{
              height: `${Math.max(0, rendered_height - HEADER_HEIGHT_PX)}px`,
              overflow: mode === "render" ? "auto" : "hidden",
              padding: "0.5rem",
              boxSizing: "border-box",
            }}
          >
            <SeedSurveyPreviewCanvas
              survey={seed_survey}
              size_px={mode === "render" ? RENDER_RESOLUTION : 255}
              render_batch={mode === "render" ? seed_survey.render_batch : null}
              render_complete={seed_survey.status === "completed"}
              render_key={seed_survey.request_id}
              uses_canvas_buffer={seed_survey.uses_canvas_buffer}
              half_span={half_span}
            />
            <div aria-live="polite" style={{ fontSize: "0.8rem", paddingTop: "0.25rem" }}>
              {seed_survey.status === "failed"
                ? `${AppText.get(KEY_ASSETS_SURVEYS_FAILED)}: ${seed_survey.error || "unknown error"}`
                : `${AppText.get(KEY_ASSETS_SURVEYS_SAMPLES)}: ${seed_survey.progress?.completed || 0} / ${seed_survey.total_samples || seed_survey.progress?.total || 0}`}
            </div>
          </div>
        </styles.FixedBlock>
      </div>,
    ];
  }
}

export default AssetsSurveys;
