import React, { Component } from "react";
import PropTypes from "prop-types";
import AppSettings from "../../../AppSettings.jsx";
import AppText from "../../../AppText.jsx";
import {
  KEY_ASSETS_SURVEYS_HALF_SPAN,
  KEY_ASSETS_SURVEYS_ITERATION_LIMIT,
} from "../../../settings/AssetsSettings.jsx";
import {
  KEY_ASSETS_SURVEYS_HALF_SPAN as KEY_ASSETS_SURVEYS_HALF_SPAN_TEXT,
  KEY_ASSETS_SURVEYS_PREVIEW,
  KEY_ASSETS_SURVEYS_CANVAS_PREVIEW,
  KEY_ASSETS_SURVEYS_CANVAS_RENDER,
  KEY_ASSETS_SURVEYS_RENDER,
  KEY_ASSETS_SURVEYS_LIMIT,
} from "../../../text/AssetsText.jsx";
import SeedSurveyCanvas from "./SeedSurveyCanvas.jsx";

const HEADER_HEIGHT_PX = 35;
const PREVIEW_RESOLUTION = 121;
const PREVIEW_SIZE_PX = 255;
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
  const divisor =
    iteration_limit >= 1_000_000_000
      ? 1_000_000_000
      : iteration_limit >= 1_000_000
        ? 1_000_000
        : 1_000;
  const suffix =
    divisor === 1_000_000_000 ? "G" : divisor === 1_000_000 ? "M" : "K";
  return `${Number((iteration_limit / divisor).toPrecision(3))}${suffix}`;
};

/** Owns survey controls and caller-specific display options. */
export class SeedSurveyRender extends Component {
  static propTypes = {
    focal_point: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
  };

  state = {
    mode: "preview",
    half_span: normalize_half_span(
      AppSettings.get(KEY_ASSETS_SURVEYS_HALF_SPAN),
    ),
    iteration_limit: normalize_iteration_limit(
      AppSettings.get(KEY_ASSETS_SURVEYS_ITERATION_LIMIT),
    ),
  };

  on_mode_change = (mode) => this.setState({ mode });

  on_half_span_change = (event) => {
    const half_span = 2 ** Number(event.target.value);
    AppSettings.on_settings_changed({
      [KEY_ASSETS_SURVEYS_HALF_SPAN]: half_span,
    });
    this.setState({ half_span });
  };

  on_iteration_limit_change = (event) => {
    const iteration_limit = Math.round(10 ** Number(event.target.value));
    AppSettings.on_settings_changed({
      [KEY_ASSETS_SURVEYS_ITERATION_LIMIT]: iteration_limit,
    });
    this.setState({ iteration_limit });
  };

  render() {
    const { mode, half_span, iteration_limit } = this.state;
    const { width_px, height_px } = this.props;
    return (
      <div
        style={{
          width: `${width_px}px`,
          height: `${height_px}px`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
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
            <span>{AppText.get(KEY_ASSETS_SURVEYS_HALF_SPAN_TEXT)}</span>
            <input
              type="range"
              min={MIN_HALF_SPAN_EXPONENT}
              max={MAX_HALF_SPAN_EXPONENT}
              step="0.01"
              value={Math.log2(half_span)}
              onChange={this.on_half_span_change}
              aria-label={AppText.get(KEY_ASSETS_SURVEYS_HALF_SPAN_TEXT)}
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
            height: `${Math.max(0, height_px - HEADER_HEIGHT_PX)}px`,
            overflow: mode === "render" ? "auto" : "hidden",
            padding: "0.5rem",
            boxSizing: "border-box",
          }}
        >
          <SeedSurveyCanvas
            size_px={mode === "render" ? RENDER_RESOLUTION : PREVIEW_SIZE_PX}
            source_size_px={
              mode === "render" ? RENDER_RESOLUTION : PREVIEW_RESOLUTION
            }
            aria_label={AppText.get(
              mode === "render"
                ? KEY_ASSETS_SURVEYS_CANVAS_RENDER
                : KEY_ASSETS_SURVEYS_CANVAS_PREVIEW,
            )}
            focal_point={this.props.focal_point}
            half_span={half_span}
            iteration_limit={iteration_limit}
          />
        </div>
      </div>
    );
  }
}

export default SeedSurveyRender;
