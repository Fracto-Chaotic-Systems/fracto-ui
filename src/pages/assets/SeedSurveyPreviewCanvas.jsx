import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import FractoCanvasBuffer from "@fracto/sdk/FractoCanvasBuffer.js";

import { pattern_color_for_lightness } from "../study/points/SeedSurveyChart.jsx";
import {
  add_confidence_to_distribution,
  build_confidence_distribution,
  confidence_lightness_from_distribution,
  create_confidence_distribution,
  update_confidence_distribution_lookup,
} from "./SeedSurveyConfidenceScale.js";
import {
  add_iteration_value,
  build_iteration_distribution,
  create_iteration_distribution,
  iteration_lightness_from_distribution,
  update_iteration_distribution_lookup,
} from "./SeedSurveyIterationScale.js";

export const SEED_SURVEY_PREVIEW_SIZE_PX = 255;
export const SEED_SURVEY_RENDER_SIZE_PX = 1024;
const SAMPLES_PER_AXIS = 121;
const UNRESOLVED_COLOR = "#888888";
const ESCAPED_COLOR = "#ffffff";
const EMPTY_POINTS = [];
const PREVIEW_SAMPLES_PER_AXIS = 121;
const BYTES_PER_RENDER_SAMPLE = 13;
const ADAPTIVE_SCALE_REFRESHES = 10;
const SAMPLE_CELL_SIZE = SEED_SURVEY_PREVIEW_SIZE_PX / SAMPLES_PER_AXIS;

const draw_points = (context, points, half_span, color_for_point) => {
  points.forEach((point) => {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    const x_index = Math.max(0, Math.min(SAMPLES_PER_AXIS - 1,
      Math.round(((point.x + half_span) / (2 * half_span)) * (SAMPLES_PER_AXIS - 1))));
    const y_index = Math.max(0, Math.min(SAMPLES_PER_AXIS - 1,
      Math.round(((half_span - point.y) / (2 * half_span)) * (SAMPLES_PER_AXIS - 1))));
    context.fillStyle = color_for_point(point);
    context.fillRect(
      x_index * SAMPLE_CELL_SIZE,
      y_index * SAMPLE_CELL_SIZE,
      SAMPLE_CELL_SIZE + 0.25,
      SAMPLE_CELL_SIZE + 0.25,
    );
  });
};

const render_cache = (render_key) => {
  const confidence_distribution = create_confidence_distribution();
  confidence_distribution.lightness_by_bucket.fill(53);
  const iteration_distribution = create_iteration_distribution();
  iteration_distribution.lightness_by_iteration.fill(53);
  return {
    render_key,
    bytes: new Uint8Array(
      SEED_SURVEY_RENDER_SIZE_PX * SEED_SURVEY_RENDER_SIZE_PX * BYTES_PER_RENDER_SAMPLE,
    ),
    received_rows: new Uint8Array(SEED_SURVEY_RENDER_SIZE_PX),
    received_row_count: 0,
    highest_received_row: -1,
    confidence_distribution,
    iteration_distribution,
    last_scale_refresh_decile: 0,
    final_scale_normalized: false,
  };
};

const canvas_buffer_cache = (render_key, size_px) => {
  const source_canvas = document.createElement("canvas");
  source_canvas.width = size_px;
  source_canvas.height = size_px;
  return {
    render_key,
    canvas_buffer: Array.from(
      { length: size_px },
      () => Array(size_px).fill(null),
    ),
    source_canvas,
  };
};

const paint_canvas_buffer = (cache, context, source_size_px, display_size_px) => {
  const source_context = cache.source_canvas.getContext("2d");
  if (!source_context) return;
  source_context.fillStyle = "#eeeeee";
  source_context.fillRect(0, 0, source_size_px, source_size_px);
  FractoCanvasBuffer.buffer_to_canvas(cache.canvas_buffer, source_context);
  context.clearRect(0, 0, display_size_px, display_size_px);
  context.drawImage(cache.source_canvas, 0, 0, display_size_px, display_size_px);
};

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
      if (cache.bytes[offset] === 4) {
        add_iteration_value(
          cache.iteration_distribution,
          view.getUint32(offset + 9, true),
        );
        continue;
      }
      if (cache.bytes[offset] === 3) continue;
      if (cache.bytes[offset] !== 1) continue;
      const confidence = view.getFloat32(offset + 5, true);
      if (!Number.isFinite(confidence) || confidence < 0) continue;
      add_confidence_to_distribution(cache.confidence_distribution, confidence);
    }
  }
};

const paint_render_rows = (
  context,
  bytes,
  start_row,
  row_count,
  confidence_distribution,
  iteration_distribution,
) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let row = start_row; row < start_row + row_count; row++) {
    for (let column = 0; column < SEED_SURVEY_RENDER_SIZE_PX; column++) {
      const offset = (row * SEED_SURVEY_RENDER_SIZE_PX + column) * BYTES_PER_RENDER_SAMPLE;
      const status = view.getUint8(offset);
      if (status === 0) {
        continue;
      }
      if (status === 3) {
        context.fillStyle = ESCAPED_COLOR;
      } else if (status === 2) {
        context.fillStyle = UNRESOLVED_COLOR;
      } else if (status === 4) {
        const lightness = iteration_lightness_from_distribution(
          view.getUint32(offset + 9, true),
          iteration_distribution,
          false,
        );
        context.fillStyle = pattern_color_for_lightness(
          view.getUint32(offset + 1, true),
          lightness,
        );
      } else {
        const pattern = view.getUint32(offset + 1, true);
        const confidence = view.getFloat32(offset + 5, true);
        const lightness = confidence_lightness_from_distribution(
          confidence,
          confidence_distribution,
          false,
        );
        context.fillStyle = pattern_color_for_lightness(pattern, lightness);
      }
      context.fillRect(column, row, 1, 1);
    }
  }
};

/** Paints preview samples or streamed 1024×1024 render rows over the fixed bounds. */
export const SeedSurveyPreviewCanvas = ({
  survey,
  size_px,
  render_batch,
  render_complete,
  render_key,
  half_span,
}) => {
  const canvas_ref = useRef(null);
  const render_cache_ref = useRef(null);
  const canvas_buffer_cache_ref = useRef(null);
  const stable_points = survey?.stable_points || EMPTY_POINTS;
  const iteration_points = survey?.iteration_points || EMPTY_POINTS;
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
    if (
      !canvas_buffer_cache_ref.current ||
      canvas_buffer_cache_ref.current.render_key !== render_key ||
      canvas_buffer_cache_ref.current.source_canvas.width !==
        (is_render ? size_px : PREVIEW_SAMPLES_PER_AXIS)
    ) {
      canvas_buffer_cache_ref.current = canvas_buffer_cache(
        render_key,
        is_render ? size_px : PREVIEW_SAMPLES_PER_AXIS,
      );
    }
    context.fillStyle = "#eeeeee";
    context.fillRect(0, 0, size_px, size_px);
  }, [is_render, render_key, size_px]);

  useEffect(() => {
    const context = canvas_ref.current?.getContext("2d");
    if (!context) return;
    if (is_render) {
      if (survey?.uses_canvas_buffer) {
        let cache = canvas_buffer_cache_ref.current;
        if (
          !cache ||
          cache.render_key !== render_key ||
          cache.source_canvas.width !== size_px
        ) {
          cache = canvas_buffer_cache(render_key, size_px);
          canvas_buffer_cache_ref.current = cache;
        }
        if (render_batch?.data && render_batch.row_count) {
          const batch_bytes = Uint8Array.from(
            atob(render_batch.data),
            (character) => character.charCodeAt(0),
          );
          const view = new DataView(batch_bytes.buffer);
          for (let row_offset = 0; row_offset < render_batch.row_count; row_offset++) {
            const row_index = render_batch.row_start + row_offset;
            for (let column = 0; column < size_px; column++) {
              const offset = (row_offset * size_px + column) * BYTES_PER_RENDER_SAMPLE;
              if (view.getUint8(offset) === 0) continue;
              // eslint-disable-next-line react-hooks/immutability -- this ref owns the incremental canvas buffer cache.
              cache.canvas_buffer[column][row_index] = [
                view.getUint32(offset + 1, true),
                view.getUint32(offset + 9, true),
              ];
            }
          }
          paint_canvas_buffer(cache, context, size_px, size_px);
        }
        return;
      }
      let cache = render_cache_ref.current;
      if (!cache || cache.render_key !== render_key) {
        cache = render_cache(render_key);
        render_cache_ref.current = cache;
        context.fillStyle = "#eeeeee";
        context.fillRect(0, 0, size_px, size_px);
      }
      if (render_batch?.data && render_batch.row_count) {
        store_render_batch(cache, render_batch);
        const completed_rows = cache.highest_received_row + 1;
        const refresh_decile = Math.min(
          ADAPTIVE_SCALE_REFRESHES,
          Math.floor((completed_rows * ADAPTIVE_SCALE_REFRESHES) / SEED_SURVEY_RENDER_SIZE_PX),
        );
        const refresh_scale = refresh_decile > cache.last_scale_refresh_decile;
        const previous_confidence_lookup = refresh_scale
          ? cache.confidence_distribution.lightness_by_bucket.slice()
          : null;
        const previous_iteration_lookup = refresh_scale
          ? cache.iteration_distribution.lightness_by_iteration.slice()
          : null;
        if (refresh_scale) {
          cache.last_scale_refresh_decile = refresh_decile;
          update_confidence_distribution_lookup(cache.confidence_distribution);
          update_iteration_distribution_lookup(cache.iteration_distribution);
        }
        const confidence_mapping_changed = refresh_scale &&
          previous_confidence_lookup.some((lightness, index) =>
            lightness !== cache.confidence_distribution.lightness_by_bucket[index]);
        const iteration_mapping_changed = refresh_scale &&
          previous_iteration_lookup.some((lightness, index) =>
            lightness !== cache.iteration_distribution.lightness_by_iteration[index]);
        const mapping_changed = confidence_mapping_changed || iteration_mapping_changed;
        const final_pass_needed = render_complete &&
          cache.received_row_count === SEED_SURVEY_RENDER_SIZE_PX &&
          !cache.final_scale_normalized;
        if (!final_pass_needed && mapping_changed) {
          context.fillStyle = "#eeeeee";
          context.fillRect(0, 0, size_px, size_px);
          paint_render_rows(
            context,
            cache.bytes,
            0,
            completed_rows,
            cache.confidence_distribution,
            cache.iteration_distribution,
          );
        } else if (!final_pass_needed) {
          paint_render_rows(
            context,
            cache.bytes,
            render_batch.row_start,
            render_batch.row_count,
            cache.confidence_distribution,
            cache.iteration_distribution,
          );
        }
      }
      if (
        render_complete &&
        cache.received_row_count === SEED_SURVEY_RENDER_SIZE_PX &&
        !cache.final_scale_normalized
      ) {
        update_confidence_distribution_lookup(cache.confidence_distribution);
        update_iteration_distribution_lookup(cache.iteration_distribution);
        cache.final_scale_normalized = true;
        context.fillStyle = "#eeeeee";
        context.fillRect(0, 0, size_px, size_px);
        paint_render_rows(
          context,
          cache.bytes,
          0,
          SEED_SURVEY_RENDER_SIZE_PX,
          cache.confidence_distribution,
          cache.iteration_distribution,
        );
      }
      return;
    }
    if (survey?.uses_canvas_buffer) {
      let cache = canvas_buffer_cache_ref.current;
      if (!cache || cache.render_key !== render_key) {
        cache = canvas_buffer_cache(render_key, PREVIEW_SAMPLES_PER_AXIS);
        canvas_buffer_cache_ref.current = cache;
      }
      if (Array.isArray(survey.canvas_buffer)) {
        cache.canvas_buffer = survey.canvas_buffer;
      } else if (survey.canvas_buffer_batch?.rows?.length) {
        survey.canvas_buffer_batch.rows.forEach(({ row_index, values }) => {
          values.forEach((point_data, canvas_x) => {
            cache.canvas_buffer[canvas_x][row_index] = point_data;
          });
        });
      }
      paint_canvas_buffer(
        cache,
        context,
        PREVIEW_SAMPLES_PER_AXIS,
        size_px,
      );
      return;
    }
    context.fillStyle = "#eeeeee";
    context.fillRect(0, 0, size_px, size_px);
    const confidence_distribution = build_confidence_distribution(
      stable_points.map((point) => point.confidence),
    );
    const iteration_distribution = build_iteration_distribution(
      iteration_points.map((point) => Number(point.iterations)),
    );
    draw_points(context, stable_points, half_span, (point) =>
      pattern_color_for_lightness(
        point.pattern,
        confidence_lightness_from_distribution(
          point.confidence,
          confidence_distribution,
        ),
      ),
    );
    draw_points(context, iteration_points, half_span, (point) => {
      const lightness = iteration_lightness_from_distribution(
        Number(point.iterations),
        iteration_distribution,
      );
      return pattern_color_for_lightness(point.pattern, lightness);
    });
    draw_points(context, unresolved_points, half_span, () => UNRESOLVED_COLOR);
    draw_points(context, escaped_points, half_span, () => ESCAPED_COLOR);
  }, [
    escaped_points,
    half_span,
    iteration_points,
    is_render,
    render_batch,
    render_complete,
    render_key,
    survey,
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
    iteration_points: PropTypes.arrayOf(PropTypes.object),
    unresolved_points: PropTypes.arrayOf(PropTypes.object),
    escaped_points: PropTypes.arrayOf(PropTypes.object),
  }),
  size_px: PropTypes.number,
  render_batch: PropTypes.shape({
    row_start: PropTypes.number,
    row_count: PropTypes.number,
    data: PropTypes.string,
  }),
  render_complete: PropTypes.bool,
  render_key: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  half_span: PropTypes.number,
};

SeedSurveyPreviewCanvas.defaultProps = {
  size_px: SEED_SURVEY_PREVIEW_SIZE_PX,
  render_batch: null,
  render_complete: false,
  render_key: "default",
  half_span: 1.5,
};

export default SeedSurveyPreviewCanvas;
