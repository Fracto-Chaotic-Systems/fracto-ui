import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import FractoUtil from "@fracto/sdk/FractoUtil.js";

import { pattern_color_for_lightness } from "../study/points/SeedSurveyChart.jsx";
import {
  add_confidence_to_distribution,
  build_confidence_distribution,
  confidence_lightness_from_distribution,
  create_confidence_distribution,
  update_confidence_distribution_lookup,
} from "./SeedSurveyConfidenceScale.js";
import {
  add_escape_iteration,
  build_escape_distribution,
  create_escape_distribution,
  escape_lightness_from_distribution,
  update_escape_distribution_lookup,
} from "./SeedSurveyEscapeScale.js";

export const SEED_SURVEY_PREVIEW_SIZE_PX = 255;
export const SEED_SURVEY_RENDER_SIZE_PX = 1024;
const SURVEY_MIN = -1.5;
const SURVEY_MAX = 1.5;
const SURVEY_STEP = 0.025;
const UNRESOLVED_COLOR = "#888888";
const ESCAPED_COLOR = "#ffffff";
const ENABLE_ESCAPE_ITERATION_SHADING = false;
const EMPTY_POINTS = [];
const BYTES_PER_RENDER_SAMPLE = 13;
const SAMPLES_PER_AXIS = Math.round((SURVEY_MAX - SURVEY_MIN) / SURVEY_STEP) + 1;
const SAMPLE_CELL_SIZE = SEED_SURVEY_PREVIEW_SIZE_PX / SAMPLES_PER_AXIS;

const draw_points = (context, points, color_for_point) => {
  points.forEach((point) => {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    const x_index = Math.max(0, Math.min(SAMPLES_PER_AXIS - 1,
      Math.round((point.x - SURVEY_MIN) / SURVEY_STEP)));
    const y_index = Math.max(0, Math.min(SAMPLES_PER_AXIS - 1,
      Math.round((SURVEY_MAX - point.y) / SURVEY_STEP)));
    context.fillStyle = color_for_point(point);
    context.fillRect(
      x_index * SAMPLE_CELL_SIZE,
      y_index * SAMPLE_CELL_SIZE,
      SAMPLE_CELL_SIZE + 0.25,
      SAMPLE_CELL_SIZE + 0.25,
    );
  });
};

const render_cache = (render_key) => ({
  render_key,
  bytes: new Uint8Array(
    SEED_SURVEY_RENDER_SIZE_PX * SEED_SURVEY_RENDER_SIZE_PX * BYTES_PER_RENDER_SAMPLE,
  ),
  received_rows: new Uint8Array(SEED_SURVEY_RENDER_SIZE_PX),
  received_row_count: 0,
  highest_received_row: -1,
  confidence_min: Infinity,
  confidence_max: -Infinity,
  confidence_distribution: create_confidence_distribution(),
  escape_iteration_min: Infinity,
  escape_iteration_max: -Infinity,
  escape_distribution: create_escape_distribution(),
});

const store_render_batch = (cache, batch) => {
  const batch_bytes = Uint8Array.from(atob(batch.data), (character) => character.charCodeAt(0));
  const row_bytes = SEED_SURVEY_RENDER_SIZE_PX * BYTES_PER_RENDER_SAMPLE;
  const view = new DataView(cache.bytes.buffer);
  cache.bytes.set(batch_bytes, batch.row_start * row_bytes);
  for (let row = batch.row_start; row < batch.row_start + batch.row_count; row++) {
    if (cache.received_rows[row]) continue;
    cache.received_rows[row] = 1;
    cache.received_row_count++;
    cache.highest_received_row = Math.max(cache.highest_received_row, row);
    const row_offset = row * row_bytes;
    for (let column = 0; column < SEED_SURVEY_RENDER_SIZE_PX; column++) {
      const offset = row_offset + column * BYTES_PER_RENDER_SAMPLE;
      if (cache.bytes[offset] === 3) {
        const iterations = view.getUint32(offset + 9, true);
        add_escape_iteration(cache.escape_distribution, iterations);
        cache.escape_iteration_min = Math.min(cache.escape_iteration_min, iterations);
        cache.escape_iteration_max = Math.max(cache.escape_iteration_max, iterations);
        continue;
      }
      if (cache.bytes[offset] !== 1) continue;
      const confidence = view.getFloat32(offset + 5, true);
      if (!Number.isFinite(confidence) || confidence < 0) continue;
      add_confidence_to_distribution(cache.confidence_distribution, confidence);
      cache.confidence_min = Math.min(cache.confidence_min, confidence);
      cache.confidence_max = Math.max(cache.confidence_max, confidence);
    }
  }
};

const paint_render_rows = (
  context,
  bytes,
  start_row,
  row_count,
  confidence_distribution,
  escape_distribution,
  phase,
  log_rows = true,
) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const canvas_bounds = context.canvas.getBoundingClientRect();
  for (let row = start_row; row < start_row + row_count; row++) {
    let stable_count = 0;
    let unresolved_count = 0;
    let escaped_count = 0;
    let unpainted_count = 0;
    let confidence_min = Infinity;
    let confidence_max = -Infinity;
    let confidence_total = 0;
    let confidence_count = 0;
    let lightness_total = 0;
    let escape_iteration_min = Infinity;
    let escape_iteration_max = -Infinity;
    let escape_lightness_total = 0;
    for (let column = 0; column < SEED_SURVEY_RENDER_SIZE_PX; column++) {
      const offset = (row * SEED_SURVEY_RENDER_SIZE_PX + column) * BYTES_PER_RENDER_SAMPLE;
      const status = view.getUint8(offset);
      if (status === 0) {
        unpainted_count++;
        continue;
      }
      if (status === 3) {
        escaped_count++;
        const iterations = view.getUint32(offset + 9, true);
        escape_iteration_min = Math.min(escape_iteration_min, iterations);
        escape_iteration_max = Math.max(escape_iteration_max, iterations);
        const lightness = escape_lightness_from_distribution(
          iterations,
          escape_distribution,
        );
        if (Number.isFinite(lightness)) escape_lightness_total += lightness;
        context.fillStyle = ENABLE_ESCAPE_ITERATION_SHADING && Number.isFinite(lightness)
          ? `hsl(0, 0%, ${lightness}%)`
          : ESCAPED_COLOR;
      } else if (status === 2) {
        unresolved_count++;
        context.fillStyle = UNRESOLVED_COLOR;
      } else {
        stable_count++;
        const pattern = view.getUint32(offset + 1, true);
        const confidence = view.getFloat32(offset + 5, true);
        if (Number.isFinite(confidence) && confidence >= 0) {
          confidence_min = Math.min(confidence_min, confidence);
          confidence_max = Math.max(confidence_max, confidence);
          confidence_total += confidence;
          confidence_count++;
        }
        const lightness = confidence_lightness_from_distribution(
          confidence,
          confidence_distribution,
        );
        if (Number.isFinite(lightness)) lightness_total += lightness;
        context.fillStyle = pattern_color_for_lightness(pattern, lightness);
      }
      context.fillRect(column, row, 1, 1);
    }
    const has_confidence = Number.isFinite(confidence_min);
    const confidence_mean = has_confidence ? confidence_total / confidence_count : null;
    if (log_rows) {
      console.log("Seed survey render row painted", {
        row,
        phase,
        canvas_backing_size: {
          width: context.canvas.width,
          height: context.canvas.height,
        },
        canvas_display_size: {
          width: canvas_bounds.width,
          height: canvas_bounds.height,
        },
        confidence_distribution_count: confidence_distribution.count,
        escape_distribution_count: escape_distribution.count,
        escape_iteration_extrema: {
          min: Number.isFinite(escape_iteration_min) ? escape_iteration_min : null,
          max: Number.isFinite(escape_iteration_max) ? escape_iteration_max : null,
        },
        confidence_extrema: {
          min: Number.isFinite(confidence_min) ? confidence_min : null,
          max: Number.isFinite(confidence_max) ? confidence_max : null,
        },
        stable_count,
        stable_confidence: has_confidence
          ? {
              min: confidence_min,
              mean: confidence_mean,
              max: confidence_max,
              mean_lightness_percent: Math.round(lightness_total / confidence_count),
            }
          : null,
        unresolved_count,
        escaped_count,
        mean_escape_lightness_percent: escaped_count
          ? Math.round(escape_lightness_total / escaped_count)
          : null,
        unpainted_count,
      });
    }
  }
};

/** Paints preview samples or streamed 1024×1024 render rows over the fixed bounds. */
export const SeedSurveyPreviewCanvas = ({
  survey,
  size_px,
  render_batch,
  confidence_range,
  render_complete,
  render_key,
}) => {
  const canvas_ref = useRef(null);
  const render_cache_ref = useRef(null);
  const stable_points = survey?.stable_points || EMPTY_POINTS;
  const unresolved_points = survey?.unresolved_points || EMPTY_POINTS;
  const escaped_points = survey?.escaped_points || EMPTY_POINTS;
  const is_render = size_px === SEED_SURVEY_RENDER_SIZE_PX;

  useEffect(() => {
    const canvas = canvas_ref.current;
    const context = canvas?.getContext("2d");
    if (!context) return;
    if (!is_render) {
      render_cache_ref.current = null;
    } else if (
      !render_cache_ref.current ||
      render_cache_ref.current.render_key !== render_key
    ) {
      render_cache_ref.current = render_cache(render_key);
    }
    context.fillStyle = "#eeeeee";
    context.fillRect(0, 0, size_px, size_px);
  }, [is_render, render_key, size_px]);

  useEffect(() => {
    const context = canvas_ref.current?.getContext("2d");
    if (!context) return;
    if (is_render) {
      let cache = render_cache_ref.current;
      if (!cache || cache.render_key !== render_key) {
        cache = render_cache(render_key);
        render_cache_ref.current = cache;
        context.fillStyle = "#eeeeee";
        context.fillRect(0, 0, size_px, size_px);
      }
      if (render_batch?.data && render_batch.row_count) {
        const previous_distribution_count = cache.confidence_distribution.count;
        const previous_escape_count = cache.escape_distribution.count;
        const previous_range = {
          min: cache.confidence_min,
          max: cache.confidence_max,
        };
        const previous_lightness_lookup =
          cache.confidence_distribution.lightness_by_bucket.slice();
        const previous_escape_lookup =
          cache.escape_distribution.lightness_by_iteration.slice();
        store_render_batch(cache, render_batch);
        update_confidence_distribution_lookup(cache.confidence_distribution);
        update_escape_distribution_lookup(cache.escape_distribution);
        const confidence_mapping_changed = previous_lightness_lookup.some(
          (lightness, index) =>
            lightness !== cache.confidence_distribution.lightness_by_bucket[index],
        );
        const escape_mapping_changed = previous_escape_lookup.some(
          (lightness, index) =>
            lightness !== cache.escape_distribution.lightness_by_iteration[index],
        );
        const mapping_changed = confidence_mapping_changed || (
          ENABLE_ESCAPE_ITERATION_SHADING && escape_mapping_changed
        );
        if (
          cache.confidence_distribution.count !== previous_distribution_count ||
          cache.escape_distribution.count !== previous_escape_count
        ) {
          console.log("Seed survey pixel distributions updated", {
            trigger_batch: {
              row_start: render_batch.row_start,
              row_end: render_batch.row_start + render_batch.row_count - 1,
            },
            previous_sample_count: previous_distribution_count,
            next_sample_count: cache.confidence_distribution.count,
            previous_extrema: {
              min: Number.isFinite(previous_range.min) ? previous_range.min : null,
              max: Number.isFinite(previous_range.max) ? previous_range.max : null,
            },
            next_extrema: {
              min: Number.isFinite(cache.confidence_min) ? cache.confidence_min : null,
              max: Number.isFinite(cache.confidence_max) ? cache.confidence_max : null,
            },
            server_extrema: confidence_range,
            confidence_mapping_changed,
            escape_mapping_changed,
            escape_iteration_extrema: {
              min: Number.isFinite(cache.escape_iteration_min)
                ? cache.escape_iteration_min
                : null,
              max: Number.isFinite(cache.escape_iteration_max)
                ? cache.escape_iteration_max
                : null,
            },
            repaint_through_row: cache.highest_received_row,
          });
        }
        if (mapping_changed) {
          context.fillStyle = "#eeeeee";
          context.fillRect(0, 0, size_px, size_px);
          paint_render_rows(
            context,
            cache.bytes,
            0,
            cache.highest_received_row + 1,
            cache.confidence_distribution,
            cache.escape_distribution,
            "distribution-rescale",
            false,
          );
        } else {
          paint_render_rows(
            context,
            cache.bytes,
            render_batch.row_start,
            render_batch.row_count,
            cache.confidence_distribution,
            cache.escape_distribution,
            "new-batch",
          );
        }
      }
      if (
        render_complete &&
        render_batch?.row_count &&
        cache.received_row_count === SEED_SURVEY_RENDER_SIZE_PX
      ) {
        context.fillStyle = "#eeeeee";
        context.fillRect(0, 0, size_px, size_px);
        paint_render_rows(
          context,
          cache.bytes,
          0,
          SEED_SURVEY_RENDER_SIZE_PX,
          cache.confidence_distribution,
          cache.escape_distribution,
          "render-complete",
        );
      }
      return;
    }
    context.fillStyle = "#eeeeee";
    context.fillRect(0, 0, size_px, size_px);
    const confidence_distribution = build_confidence_distribution(
      stable_points.map((point) => point.confidence),
    );
    const escape_distribution = build_escape_distribution(
      escaped_points.map((point) => Number(point.iterations)),
    );
    draw_points(context, stable_points, (point) =>
      pattern_color_for_lightness(
        point.pattern,
        confidence_lightness_from_distribution(
          point.confidence,
          confidence_distribution,
        ),
      ),
    );
    draw_points(context, unresolved_points, () => UNRESOLVED_COLOR);
    draw_points(context, escaped_points, (point) => {
      if (!ENABLE_ESCAPE_ITERATION_SHADING) return ESCAPED_COLOR;
      const lightness = escape_lightness_from_distribution(
        Number(point.iterations),
        escape_distribution,
      );
      return Number.isFinite(lightness)
        ? `hsl(0, 0%, ${lightness}%)`
        : FractoUtil.fracto_pattern_color(0, Math.max(1, Number(point.iterations) || 1));
    });
  }, [
    escaped_points,
    is_render,
    render_batch,
    render_complete,
    render_key,
    confidence_range,
    size_px,
    stable_points,
    unresolved_points,
  ]);

  return (
    <canvas
      ref={canvas_ref}
      width={size_px}
      height={size_px}
      aria-label={is_render ? "Seed survey high-resolution render" : "Seed survey preview"}
      style={{
        display: "block",
        width: `${size_px}px`,
        height: `${size_px}px`,
        marginLeft: "0.25rem",
        backgroundColor: "#eeeeee",
      }}
    />
  );
};

SeedSurveyPreviewCanvas.propTypes = {
  survey: PropTypes.shape({
    stable_points: PropTypes.arrayOf(PropTypes.object),
    unresolved_points: PropTypes.arrayOf(PropTypes.object),
    escaped_points: PropTypes.arrayOf(PropTypes.object),
  }),
  size_px: PropTypes.number,
  render_batch: PropTypes.shape({
    row_start: PropTypes.number,
    row_count: PropTypes.number,
    data: PropTypes.string,
  }),
  confidence_range: PropTypes.shape({ min: PropTypes.number, max: PropTypes.number }),
  render_complete: PropTypes.bool,
  render_key: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

SeedSurveyPreviewCanvas.defaultProps = {
  size_px: SEED_SURVEY_PREVIEW_SIZE_PX,
  render_batch: null,
  confidence_range: null,
  render_complete: false,
  render_key: "default",
};

export default SeedSurveyPreviewCanvas;
