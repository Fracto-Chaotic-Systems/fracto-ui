import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { Chart as ChartJS, registerables } from "chart.js";
import { Scatter } from "react-chartjs-2";

import FractoUtil from "@fracto/sdk/FractoUtil.js";
import AppText from "../../../AppText.jsx";
import { MARGIN_PX } from "../../../styles/MainStyles.jsx";
import { CoolStyles } from "../../../utils/ui/CoolImports.jsx";
import {
  KEY_STUDY_POINTS_SEED_SURVEY_IM,
  KEY_STUDY_POINTS_SEED_SURVEY_MAGNITUDE_RANGE,
  KEY_STUDY_POINTS_SEED_SURVEY_RE,
  KEY_STUDY_POINTS_SEED_SURVEY_STABLE_COUNT,
} from "../../../text/StudyText.jsx";

ChartJS.register(...registerables);

const SurveyWrapper = styled(CoolStyles.InlineBlock)`
  margin: 0 ${MARGIN_PX}px;
  background-color: #fcfcfc;
`;
const SurveyTitle = styled(CoolStyles.Block)`
  ${CoolStyles.italic}
  ${CoolStyles.underline}
  ${CoolStyles.align_center}
  color: #666666;
  font-size: 1.25rem;
  height: 2rem;
`;
const SurveyCanvas = styled(CoolStyles.InlineBlock)`
  border: 1.5px solid #666666;
  border-radius: 3px;
  box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.25);
  background-color: #fcfcfc;
`;
const SurveySummary = styled(CoolStyles.Block)`
  ${CoolStyles.align_center}
  color: #444444;
  font-size: 0.8rem;
  line-height: 1.25rem;
`;

export const pattern_color_for_lightness = (pattern, lightness) => {
  const base_color = FractoUtil.fracto_pattern_color(pattern);
  if (!Number.isFinite(lightness)) return base_color;
  const hsl = base_color.match(/^hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)$/i);
  if (!hsl) return base_color;
  const normalized_lightness = Math.max(0, Math.min(100, Math.round(lightness)));
  return `hsl(${hsl[1]}, ${hsl[2]}%, ${normalized_lightness}%)`;
};

export const pattern_color_for_confidence = (
  pattern,
  confidence,
  confidence_min,
  confidence_max,
) => {
  if (!Number.isFinite(confidence)) {
    return FractoUtil.fracto_pattern_color(pattern);
  }
  const confidence_range = confidence_max - confidence_min;
  const normalized_confidence = confidence_range > 0
    ? Math.max(0, Math.min(1, (confidence - confidence_min) / confidence_range))
    : 0.5;
  const lightness = Math.round(18 + 70 * normalized_confidence);
  return pattern_color_for_lightness(pattern, lightness);
};

const chart_options = {
  animation: false,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => {
          const { x, y, pattern, unresolved, confidence } = context.raw;
          const confidence_label = Number.isFinite(confidence)
            ? `; confidence ${confidence.toFixed(3)}`
            : "";
          return unresolved
            ? `(${x.toFixed(2)}, ${y.toFixed(2)}): unresolved${confidence_label}`
            : `(${x.toFixed(2)}, ${y.toFixed(2)}): period ${pattern}${confidence_label}`;
        },
      },
    },
  },
  scales: {
    x: {
      type: "linear",
      min: -1,
      max: 1,
      title: { display: true, text: "Re seed" },
      ticks: { stepSize: 0.5 },
      grid: { color: (context) => context.tick.value === 0 ? "#777777" : "#dddddd" },
    },
    y: {
      type: "linear",
      min: 0,
      max: 2,
      title: { display: true, text: "Im seed" },
      ticks: { stepSize: 0.5 },
      grid: { color: (context) => context.tick.value === 0 ? "#777777" : "#dddddd" },
    },
  },
};

export const SeedSurveyChart = ({ survey, width_px, title }) => {
  const stable_points = survey?.stable_points || [];
  const unresolved_points = survey?.unresolved_points || [];
  const confidences = stable_points
    .map((point) => point.confidence)
    .filter(Number.isFinite);
  const confidence_min = confidences.length ? Math.min(...confidences) : 0;
  const confidence_max = confidences.length ? Math.max(...confidences) : 1;
  const magnitude_range = survey?.orbital_magnitude_range;
  const format_magnitude = (value) =>
    Number.isFinite(Number(value)) ? Number(value).toPrecision(6) : "—";
  const chart_data = {
    datasets: [
      {
        data: stable_points.map((point) => ({
          x: point.x,
          y: point.y,
          pattern: point.pattern,
          confidence: point.confidence,
          unresolved: true,
        })),
        pointBackgroundColor: stable_points.map((point) =>
          pattern_color_for_confidence(
            point.pattern,
            point.confidence,
            confidence_min,
            confidence_max,
          ),
        ),
        pointBorderColor: stable_points.map((point) =>
          pattern_color_for_confidence(
            point.pattern,
            point.confidence,
            confidence_min,
            confidence_max,
          ),
        ),
        pointRadius: 1.5,
        pointHoverRadius: 3,
        showLine: false,
      },
      {
        data: unresolved_points.map((point) => ({
          x: point.x,
          y: point.y,
          pattern: point.pattern,
          confidence: point.confidence,
        })),
        pointBackgroundColor: "#888888",
        pointBorderColor: "#666666",
        pointRadius: 1.5,
        pointHoverRadius: 3,
        showLine: false,
      },
    ],
  };
  const style = { width: `${width_px}px`, height: `${width_px}px` };
  const options = {
    ...chart_options,
    scales: {
      ...chart_options.scales,
      x: {
        ...chart_options.scales.x,
        min: survey?.real_min ?? -1,
        max: survey?.real_max ?? 1,
        title: {
          ...chart_options.scales.x.title,
          text: AppText.get(KEY_STUDY_POINTS_SEED_SURVEY_RE),
        },
      },
      y: {
        ...chart_options.scales.y,
        min: survey?.imaginary_min ?? 0,
        max: survey?.imaginary_max ?? 2,
        title: {
          ...chart_options.scales.y.title,
          text: AppText.get(KEY_STUDY_POINTS_SEED_SURVEY_IM),
        },
      },
    },
  };

  return (
    <SurveyWrapper>
      <SurveyTitle>{title}</SurveyTitle>
      <SurveyCanvas style={style}>
        <Scatter data={chart_data} options={options} />
      </SurveyCanvas>
      <SurveySummary>
        {AppText.get(KEY_STUDY_POINTS_SEED_SURVEY_STABLE_COUNT)}: {survey?.stable_count || 0} / {survey?.total_samples || 0}
      </SurveySummary>
      {survey?.outcome_counts ? (
        <SurveySummary>
          Candidates {survey.outcome_counts.non_singleton_candidate || 0}; single-point {survey.outcome_counts.single_point_candidate || 0}; unresolved {survey.outcome_counts.unresolved || 0}; escaped {survey.outcome_counts.escaped || 0}
        </SurveySummary>
      ) : null}
      {survey?.status === "queued" || survey?.status === "running" ? (
        <SurveySummary>
          Seed survey {survey.status}: {survey.progress?.completed || 0} / {survey.progress?.total || survey.total_samples || 0}
        </SurveySummary>
      ) : survey?.status === "failed" ? (
        <SurveySummary>Seed survey failed: {survey.error || "unknown error"}</SurveySummary>
      ) : null}
      <SurveySummary>
        {AppText.get(KEY_STUDY_POINTS_SEED_SURVEY_MAGNITUDE_RANGE)}: {magnitude_range
          ? `${format_magnitude(magnitude_range.min)} – ${format_magnitude(magnitude_range.max)}`
          : "—"}
      </SurveySummary>
    </SurveyWrapper>
  );
};

SeedSurveyChart.propTypes = {
  survey: PropTypes.shape({
    stable_count: PropTypes.number,
    total_samples: PropTypes.number,
    stable_points: PropTypes.arrayOf(
      PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
        pattern: PropTypes.number.isRequired,
        confidence: PropTypes.number,
      }),
    ),
    unresolved_points: PropTypes.arrayOf(
      PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
        pattern: PropTypes.number,
        confidence: PropTypes.number,
      }),
    ),
  }),
  width_px: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
};

export default SeedSurveyChart;
