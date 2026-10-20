import React, { Component } from "react";
import PropTypes from "prop-types";
import { Chart as ChartJS, registerables } from "chart.js";
import FractoFastCalc from "@fracto/sdk/FractoFastCalc.js";
import { newton_big_complex } from "@fracto/sdk/orbitals/FractoNewtonBigComplex.js";
import { click_point_chart } from "../../../utils/render/PatternsUtils.jsx";
import { IMAGE_FRAME_STYLE } from "../../../utils/render/ImageFrameStyle.jsx";
import { KEY_STUDY_CIRCUITRY_NO_ORBITAL } from "../../../text/StudyText.jsx";

ChartJS.register(...registerables);

import AppText from "../../../AppText.jsx";
import SeedSurveyCanvas from "./SeedSurveyCanvas.jsx";
import SeedSurveyOrbitals from "./SeedSurveyOrbitals.jsx";
import SeedSurveyRays from "./SeedSurveyRays.jsx";
import { paint_survey_rays } from "./SeedSurveyRayOverlay.js";
import {
  orbital_confirmation,
  orbital_closure_error,
  ORBIT_CLOSURE_TOLERANCE,
} from "./SeedSurveyOrbitConfirmation.js";
import {
  KEY_ASSETS_SURVEYS_DETECT,
  KEY_ASSETS_SURVEYS_CANVAS_DETECT,
  KEY_ASSETS_SURVEYS_SEEDED_ORBIT,
  KEY_ASSETS_SURVEYS_SEED_COORDINATES,
  KEY_ASSETS_SURVEYS_PATTERN,
  KEY_ASSETS_SURVEYS_ORBIT_NEWTON,
  KEY_ASSETS_SURVEYS_ORBIT_LEGACY,
  KEY_ASSETS_SURVEYS_ORBIT_MAGNITUDE,
  KEY_ASSETS_SURVEYS_ORBIT_CONFIDENCE,
  KEY_ASSETS_SURVEYS_NEWTON_CYCLES,
  KEY_ASSETS_SURVEYS_CLOSURE_ERROR,
  KEY_ASSETS_SURVEYS_CLOSURE_PASS,
  KEY_ASSETS_SURVEYS_CLOSURE_FAIL,
} from "../../../text/AssetsText.jsx";

const HALF_SPAN = 1.5;
const ITERATION_LIMIT = 100000;
const ORBIT_CHART_SIZE_PX = 550;

/** Detection view with a coarse sample grid scaled to its display canvas. */
export class SeedSurveyDetect extends Component {
  static propTypes = {
    focal_point: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
  };

  state = {
    seed: { x: 0, y: 0 },
    calculation: null,
    newton: null,
    orbit_method: "newton",
    survey_snapshot: null,
    selected_orbital: null,
    rays: [],
  };
  pending_frame = null;
  pending_seed = null;
  hovering = false;
  survey_canvas = null;
  survey_image = null;

  componentDidMount() {
    this.calculate_orbit({ x: 0, y: 0 });
  }

  componentDidUpdate(previous_props) {
    if (
      previous_props.focal_point?.x !== this.props.focal_point?.x ||
      previous_props.focal_point?.y !== this.props.focal_point?.y
    ) {
      if (this.pending_frame !== null) cancelAnimationFrame(this.pending_frame);
      this.pending_frame = null;
      this.pending_seed = null;
      this.setState({ selected_orbital: null, rays: [] });
      this.calculate_orbit({ x: 0, y: 0 });
    }
  }

  componentWillUnmount() {
    if (this.pending_frame !== null) cancelAnimationFrame(this.pending_frame);
  }

  calculate_orbit = (seed) => {
    const focal_point = this.props.focal_point;
    const calculation =
      Number.isFinite(focal_point?.x) && Number.isFinite(focal_point?.y)
        ? FractoFastCalc.calc_from_seed(
            focal_point.x,
            focal_point.y,
            seed.x,
            seed.y,
            0.00625,
            ITERATION_LIMIT,
          )
        : null;
    const newton =
      Number.isInteger(calculation?.pattern) && calculation.pattern > 0
        ? newton_big_complex(focal_point, 80, calculation.pattern, {
            precision_digits: 64,
            seed,
          })
        : null;
    this.setState({ seed, calculation, newton }, this.paint_overlay);
  };

  on_rays = (rays) => this.setState({ rays }, this.paint_overlay);

  on_survey_update = (survey_snapshot) => this.setState({ survey_snapshot });

  draw_Q = (canvas) => {
    const context = canvas.getContext("2d");
    if (!context) return;
    this.survey_canvas = canvas;
    this.survey_image = context.getImageData(0, 0, canvas.width, canvas.height);
    this.paint_overlay();
  };

  paint_overlay = () => {
    const canvas = this.survey_canvas;
    if (!canvas || !this.survey_image) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.putImageData(this.survey_image, 0, 0);
    const { focal_point } = this.props;
    if (!Number.isFinite(focal_point?.x) || !Number.isFinite(focal_point?.y))
      return;
    if (!this.hovering && this.state.selected_orbital) {
      paint_survey_rays(
        context,
        canvas,
        this.state.rays,
        HALF_SPAN,
        this.state.selected_orbital.points.length,
      );
    }
    const Q = FractoFastCalc.calculate_cardioid_Q(
      focal_point.x,
      focal_point.y,
      -1,
    );
    if (!Number.isFinite(Q?.x) || !Number.isFinite(Q?.y)) return;
    const x = ((Q.x + HALF_SPAN) / (2 * HALF_SPAN)) * canvas.width;
    const y = ((HALF_SPAN - Q.y) / (2 * HALF_SPAN)) * canvas.height;
    context.save();
    context.fillStyle = "#ffffff";
    if (this.hovering || this.state.selected_orbital) {
      for (const point of this.orbital_details().points) {
        const point_x =
          ((point.x + HALF_SPAN) / (2 * HALF_SPAN)) * canvas.width;
        const point_y =
          ((HALF_SPAN - point.y) / (2 * HALF_SPAN)) * canvas.height;
        context.beginPath();
        context.arc(point_x, point_y, 1.5, 0, 2 * Math.PI);
        context.fill();
        context.strokeStyle = "#000000";
        context.lineWidth = 1;
        context.strokeRect(point_x - 3, point_y - 3, 6, 6);
      }
    }
    context.fillStyle = "#ffffff";
    context.beginPath();
    // Draw Q last so it remains visible above orbital markers.
    context.arc(x, y, 4, 0, 2 * Math.PI);
    context.fill();
    context.strokeStyle = "#000000";
    context.lineWidth = 1;
    context.stroke();
    context.restore();
  };

  on_seed_hover = (seed) => {
    this.hovering = true;
    this.pending_seed = seed;
    if (this.pending_frame !== null) return;
    this.pending_frame = requestAnimationFrame(() => {
      this.pending_frame = null;
      const next_seed = this.pending_seed;
      this.pending_seed = null;
      if (
        next_seed &&
        (next_seed.x !== this.state.seed.x || next_seed.y !== this.state.seed.y)
      ) {
        this.calculate_orbit(next_seed);
      } else {
        this.paint_overlay();
      }
    });
  };

  on_select_orbital = (orbital) => {
    if (this.pending_frame !== null) cancelAnimationFrame(this.pending_frame);
    this.pending_frame = null;
    this.pending_seed = null;
    this.setState({ selected_orbital: orbital, orbit_method: "newton" }, () =>
      this.calculate_orbit(orbital.seed),
    );
  };

  on_seed_leave = () => {
    this.hovering = false;
    if (this.pending_frame !== null) cancelAnimationFrame(this.pending_frame);
    this.pending_frame = null;
    this.pending_seed = null;
    if (this.state.selected_orbital) {
      this.calculate_orbit(this.state.selected_orbital.seed);
    } else {
      this.paint_overlay();
    }
  };

  orbital_details = () => {
    const { calculation, newton, orbit_method } = this.state;
    const candidates =
      orbit_method === "legacy"
        ? calculation?.orbital_points || []
        : (newton?.closure_reached === true ? newton.point_list : []).map(
            (point) => ({ x: Number(point.re), y: Number(point.im) }),
          );
    const points = candidates
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      .slice(0, calculation?.pattern || 0);
    const { focal_point } = this.props;
    const center =
      points.length &&
      Number.isFinite(focal_point?.x) &&
      Number.isFinite(focal_point?.y)
        ? FractoFastCalc.calculate_cardioid_Q(focal_point.x, focal_point.y, -1)
        : null;
    const Q =
      center && Number.isFinite(center.x) && Number.isFinite(center.y)
        ? center
        : null;
    const magnitude =
      Q && points.length
        ? points.reduce(
            (maximum, point) =>
              Math.max(maximum, Math.hypot(point.x - Q.x, point.y - Q.y)),
            0,
          )
        : null;
    return {
      points,
      Q,
      magnitude,
      confirmation: orbital_confirmation(points, magnitude),
      closure_error:
        orbit_method === "newton"
          ? (newton?.closure_error ??
            orbital_closure_error(points, focal_point))
          : orbital_closure_error(points, focal_point),
    };
  };

  render_orbital_chart = (details = this.orbital_details()) => {
    const { points, Q } = details;
    if (!points.length) return AppText.get(KEY_STUDY_CIRCUITRY_NO_ORBITAL);
    const { calculation } = this.state;
    const origin = points.length > 1 ? Q : null;
    // Same point markers, radial guides, axes, and scatter configuration as circuitry.
    return click_point_chart(
      [],
      points,
      false,
      false,
      null,
      "#888888",
      false,
      4,
      origin,
      null,
      0,
      -1,
      calculation.pattern,
      null,
      null,
      true,
    );
  };

  on_orbit_method_change = (event) => {
    this.setState({ orbit_method: event.target.value }, this.paint_overlay);
  };

  render() {
    const { width_px, height_px, focal_point } = this.props;
    const details = this.orbital_details();
    return (
      <div
        aria-label={AppText.get(KEY_ASSETS_SURVEYS_DETECT)}
        style={{
          width: `${width_px}px`,
          height: `${height_px}px`,
          maxHeight: "100%",
          overflow: "auto",
          textAlign: "left",
        }}
      >
        <div
          style={{
            display: "inline-block",
            margin: "0.5rem",
            verticalAlign: "top",
          }}
        >
          <SeedSurveyCanvas
            focal_point={focal_point}
            size_px={ORBIT_CHART_SIZE_PX}
            source_size_px={250}
            half_span={HALF_SPAN}
            iteration_limit={ITERATION_LIMIT}
            aria_label={AppText.get(KEY_ASSETS_SURVEYS_CANVAS_DETECT)}
            on_seed_hover={this.on_seed_hover}
            on_seed_leave={this.on_seed_leave}
            on_canvas_rendered={this.draw_Q}
            on_survey_update={this.on_survey_update}
          />
          <SeedSurveyOrbitals
            selected_orbital={this.state.selected_orbital}
            on_select_orbital={this.on_select_orbital}
            key={`${focal_point?.x},${focal_point?.y}`}
            survey={
              this.state.survey_snapshot?.focal_point?.x === focal_point?.x &&
              this.state.survey_snapshot?.focal_point?.y === focal_point?.y
                ? this.state.survey_snapshot
                : null
            }
          />
          <SeedSurveyRays
            focal_point={focal_point}
            orbital={this.state.selected_orbital}
            on_rays={this.on_rays}
          />
        </div>
        <div
          style={{
            display: "inline-block",
            margin: "0.5rem",
            verticalAlign: "top",
          }}
        >
          <div
            role="img"
            aria-label={AppText.get(KEY_ASSETS_SURVEYS_SEEDED_ORBIT)}
            style={{
              ...IMAGE_FRAME_STYLE,
              width: `${ORBIT_CHART_SIZE_PX}px`,
              height: `${ORBIT_CHART_SIZE_PX}px`,
              boxSizing: "border-box",
            }}
          >
            {this.render_orbital_chart(details)}
          </div>
          <div style={{ fontSize: "0.8rem", paddingTop: "0.25rem" }}>
            {AppText.get(KEY_ASSETS_SURVEYS_ORBIT_CONFIDENCE).replace(
              "${confidence}",
              details.confirmation === null
                ? "—"
                : `${(100 * details.confirmation.confidence).toFixed(2)}%`,
            )}
            <div>
              {AppText.get(KEY_ASSETS_SURVEYS_NEWTON_CYCLES).replace(
                "${cycles}",
                String(this.state.newton?.cycles ?? "—"),
              )}
            </div>
            <div>
              {AppText.get(KEY_ASSETS_SURVEYS_CLOSURE_ERROR)
                .replace(
                  "${error}",
                  details.closure_error === null
                    ? "—"
                    : details.closure_error.toExponential(3),
                )
                .replace(
                  "${status}",
                  details.closure_error === null
                    ? "—"
                    : AppText.get(
                        details.closure_error <= ORBIT_CLOSURE_TOLERANCE
                          ? KEY_ASSETS_SURVEYS_CLOSURE_PASS
                          : KEY_ASSETS_SURVEYS_CLOSURE_FAIL,
                      ),
                )}
            </div>
          </div>
          <div style={{ fontSize: "0.8rem", paddingTop: "0.25rem" }}>
            {AppText.get(KEY_ASSETS_SURVEYS_SEED_COORDINATES)
              .replace(
                "${x}",
                Number(this.state.seed.x.toPrecision(6)).toString(),
              )
              .replace(
                "${y}",
                Number(this.state.seed.y.toPrecision(6)).toString(),
              )}
            <div>
              {AppText.get(KEY_ASSETS_SURVEYS_PATTERN).replace(
                "${pattern}",
                String(this.state.calculation?.pattern ?? "—"),
              )}
            </div>
            <div>
              {AppText.get(KEY_ASSETS_SURVEYS_ORBIT_MAGNITUDE).replace(
                "${magnitude}",
                details.magnitude === null
                  ? "—"
                  : Number(details.magnitude.toPrecision(10)).toString(),
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: "1rem", paddingTop: "0.5rem" }}>
            {[
              ["newton", KEY_ASSETS_SURVEYS_ORBIT_NEWTON],
              ["legacy", KEY_ASSETS_SURVEYS_ORBIT_LEGACY],
            ].map(([method, label]) => (
              <label key={method}>
                <input
                  type="radio"
                  name="seed-survey-orbit-method"
                  value={method}
                  checked={this.state.orbit_method === method}
                  onChange={this.on_orbit_method_change}
                />
                {AppText.get(label)}
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

export default SeedSurveyDetect;
