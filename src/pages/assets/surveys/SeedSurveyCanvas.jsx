import React, { Component } from "react";
import PropTypes from "prop-types";
import DataBackend from "../../../backend/DataBackend.jsx";
import AppText from "../../../AppText.jsx";
import {
  KEY_ASSETS_SURVEYS_FAILED,
  KEY_ASSETS_SURVEYS_SAMPLES,
} from "../../../text/AssetsText.jsx";
import {
  canvas_buffer_cache,
  paint_canvas_buffer,
  store_packed_rows,
  store_canvas_rows,
} from "./SeedSurveyCanvasBuffer.js";

/** Displays caller-sized pattern/iteration data through FractoCanvasBuffer. */
export class SeedSurveyCanvas extends Component {
  static propTypes = {
    source_size_px: PropTypes.number.isRequired,
    size_px: PropTypes.number.isRequired,
    aria_label: PropTypes.string.isRequired,
    focal_point: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
    half_span: PropTypes.number.isRequired,
    iteration_limit: PropTypes.number.isRequired,
  };

  state = { survey: { status: "idle" }, request_id: 0, after_row: 0 };
  active_request_id = 0;

  canvas_ref = React.createRef();
  canvas_buffer_cache = null;

  componentDidMount() {
    this.is_mounted = true;
    this.request_survey();
  }

  request_key = (props) => {
    const { focal_point, source_size_px, half_span, iteration_limit } = props;
    return `${focal_point?.x},${focal_point?.y}:${source_size_px}:${half_span}:${iteration_limit}`;
  };

  componentDidUpdate(previous_props, previous_state) {
    if (this.request_key(previous_props) !== this.request_key(this.props)) {
      this.request_survey();
      return;
    }
    const reset =
      previous_state.request_id !== this.state.request_id ||
      previous_props.source_size_px !== this.props.source_size_px ||
      previous_props.size_px !== this.props.size_px;
    if (reset || previous_state.survey !== this.state.survey)
      this.paint_canvas(reset);
  }

  componentWillUnmount() {
    this.is_mounted = false;
    this.active_request_id++;
    clearTimeout(this.poll_timer);
  }

  request_survey = () => {
    const request_id = ++this.active_request_id;
    clearTimeout(this.poll_timer);
    const { focal_point, source_size_px, half_span, iteration_limit } =
      this.props;
    const valid =
      Number.isFinite(focal_point?.x) && Number.isFinite(focal_point?.y);
    this.setState({
      request_id,
      after_row: 0,
      survey: { status: valid ? "queued" : "idle" },
    });
    if (!valid) return;
    DataBackend.start_seed_survey(
      focal_point,
      source_size_px,
      half_span,
      iteration_limit,
      (response) => {
        if (!this.is_mounted || request_id !== this.active_request_id) return;
        if (response.error) {
          this.setState({
            survey: { status: "failed", error: response.error },
          });
          return;
        }
        this.accept_job(response.result || {}, request_id);
      },
    );
  };

  poll_survey = (job_id, request_id) => {
    DataBackend.get_seed_survey_job(
      job_id,
      (job) => {
        if (!this.is_mounted || request_id !== this.active_request_id) return;
        this.accept_job({ ...job, job_id }, request_id);
      },
      this.state.after_row,
    );
  };

  accept_job = (job, request_id) => {
    const batch = job.render_batch?.row_count
      ? job.render_batch
      : job.canvas_buffer_batch;
    const after_row = batch?.row_count
      ? batch.row_start + batch.row_count
      : this.state.after_row;
    this.setState(
      (state) => ({
        after_row,
        survey: {
          ...state.survey,
          ...(job.result || {}),
          ...job,
          status: job.error ? "failed" : job.status || "queued",
        },
      }),
      () => {
        if (!this.is_mounted || request_id !== this.active_request_id) return;
        if (
          job.error ||
          ["failed", "cancelled"].includes(job.status) ||
          !job.job_id
        )
          return;
        // A completed job can still have unread batches; drain either wire format.
        const available_rows = Math.max(
          job.render_rows_completed || 0,
          job.preview_rows_completed || 0,
        );
        if (job.status === "completed" && after_row >= available_rows) return;
        this.poll_timer = setTimeout(
          () => this.poll_survey(job.job_id, request_id),
          job.status === "completed" ? 0 : 1000,
        );
      },
    );
  };

  paint_canvas = (reset) => {
    const { source_size_px, size_px } = this.props;
    const { survey, request_id: cache_key } = this.state;
    const {
      canvas_buffer,
      canvas_buffer_batch: row_batch,
      render_batch: packed_batch,
    } = survey;
    const context = this.canvas_ref.current?.getContext("2d");
    if (!context) return;
    if (
      !this.canvas_buffer_cache ||
      this.canvas_buffer_cache.cache_key !== cache_key ||
      this.canvas_buffer_cache.source_canvas.width !== source_size_px
    ) {
      this.canvas_buffer_cache = canvas_buffer_cache(cache_key, source_size_px);
    }
    if (reset) {
      context.fillStyle = "#eeeeee";
      context.fillRect(0, 0, size_px, size_px);
    }
    const cache = this.canvas_buffer_cache;
    store_canvas_rows(cache, canvas_buffer, row_batch);
    if (packed_batch?.data && packed_batch.row_count) {
      store_packed_rows(cache, packed_batch, source_size_px);
    }
    paint_canvas_buffer(cache, context, source_size_px, size_px);
  };

  render() {
    const { size_px, aria_label } = this.props;
    return (
      <div>
        <canvas
          ref={this.canvas_ref}
          width={size_px}
          height={size_px}
          aria-label={aria_label}
          style={{
            display: "block",
            width: `${size_px}px`,
            height: `${size_px}px`,
            marginLeft: "0.25rem",
            backgroundColor: "#eeeeee",
          }}
        />
        <div
          aria-live="polite"
          style={{ fontSize: "0.8rem", paddingTop: "0.25rem" }}
        >
          {this.state.survey.status === "failed"
            ? `${AppText.get(KEY_ASSETS_SURVEYS_FAILED)}: ${this.state.survey.error || "unknown error"}`
            : `${AppText.get(KEY_ASSETS_SURVEYS_SAMPLES)}: ${this.state.survey.progress?.completed || 0} / ${this.state.survey.total_samples || this.state.survey.progress?.total || 0}`}
        </div>
      </div>
    );
  }
}

export default SeedSurveyCanvas;
