import React, { Component } from "react";

import FractoFastCalc from "@fracto/sdk/FractoFastCalc.js";

import {
  MainStyles as styles,
  MARGIN_PX,
  TITLE_BAR_HEIGHT_PX,
} from "../../../styles/MainStyles.jsx";
import AppSettings from "../../../AppSettings.jsx";
import AppText from "../../../AppText.jsx";
import {
  KEY_STUDY_POINTS_FRAME_SETTINGS,
  KEY_STUDY_POINTS_SPLITTER_POS,
  KEY_STUDY_SPLITTER_POS_PX,
} from "../../../settings/StudySettings.jsx";
import {
  KEY_STUDY_POINTS_LEGACY_ITERATIVE,
  KEY_STUDY_POINTS_SEED_SURVEY,
} from "../../../text/StudyText.jsx";

import { update_dimensions } from "./../../PageUtils.jsx";
import DataBackend from "../../../backend/DataBackend.jsx";
import PointsSeriesChart from "./PointsSeriesChart.jsx";
import SeedSurveyChart from "./SeedSurveyChart.jsx";
import Complex from "@fracto/sdk/math/Complex.js";

const UPDATE_INTERVAL_MS = 1000;

export class PointsMainPanel extends Component {
  state = {
    rendered_width: 0,
    rendered_height: 0,
    interval: null,
    frame_settings: {},
    subscription: null,
    in_fetch: false,
    pro_derived: { cardinality: 0, point_list: [], elapsed_ms: 0 },
    seed_survey: {
      stable_count: 0,
      total_samples: 0,
      stable_points: [],
      unresolved_points: [],
    },
    newton_derived: { cardinality: 0, point_list: [], elapsed_ms: 0 },
    set2: [],
  };

  componentDidMount() {
    this.is_mounted = true;
    this.update_dimensions();
    const frame_settings = AppSettings.get(KEY_STUDY_POINTS_FRAME_SETTINGS);
    this.last_chart_focal_point = frame_settings?.focal_point
      ? { ...frame_settings.focal_point }
      : null;
    this.setState({
      interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
      frame_settings,
      subscription: AppSettings.subscribe(
        KEY_STUDY_POINTS_FRAME_SETTINGS,
        this.on_frame_settings_changed,
      ),
    });
  }

  componentWillUnmount() {
    this.is_mounted = false;
    this.seed_survey_request_id = (this.seed_survey_request_id || 0) + 1;
    this.pending_chart_update = null;
    if (this.seed_survey_poll_timer) {
      clearTimeout(this.seed_survey_poll_timer);
    }
    const { interval, subscription } = this.state;
    if (interval) {
      clearInterval(interval);
    }
    if (subscription) {
      AppSettings.unsubscribe(subscription);
    }
  }

  on_frame_settings_changed = (key, value) => {
    const focal_point = value?.focal_point;
    if (
      !focal_point ||
      !Number.isFinite(focal_point.x) ||
      !Number.isFinite(focal_point.y)
    ) {
      console.log("on_frame_settings_changed bad number", value);
      return;
    }
    const focal_point_changed =
      !this.last_chart_focal_point ||
      focal_point.x !== this.last_chart_focal_point.x ||
      focal_point.y !== this.last_chart_focal_point.y;
    this.setState({ frame_settings: value });
    if (!focal_point_changed) {
      return;
    }
    this.last_chart_focal_point = { ...focal_point };
    const Q_core_neg = FractoFastCalc.calculate_cardioid_Q(
      focal_point.x,
      focal_point.y,
      -1,
    );
    this.setState({ set2: [Q_core_neg] });
    this.on_chart_update(key, value);
  };

  update_dimensions = () => {
    const { rendered_width, rendered_height } = this.state;
    const new_values = update_dimensions(
      rendered_width,
      rendered_height,
      KEY_STUDY_SPLITTER_POS_PX,
    );
    if (new_values) {
      this.setState(new_values);
    }
  };

  /**
   * Adapt the detector/Newton response to the point-series chart contract.
   * The chart predates `/orbital_newton` and expects `{step, point,
   * scaled_point}` records, while the endpoint returns refined complex points.
   * @param {object} response Detector/Newton endpoint response.
   * @param {{x:number,y:number}} focal_point Complex-plane focal point.
   * @returns {{cardinality:number, point_list:Array<object>}} Chart data.
   */
  format_detected_newton = (response, focal_point) => {
    const result = response?.newton_big_complex || response?.newton_native;
    const q = FractoFastCalc.calculate_cardioid_Q(
      focal_point.x,
      focal_point.y,
      -1,
    );
    const point_list = (result?.point_list || []).map((point, step) => {
      const re = String(point.re);
      const im = String(point.im);
      return {
        step,
        point: { re, im },
        scaled_point: {
          re: String(Number(re) - q.x),
          im: String(Number(im) - q.y),
        },
      };
    });
    if (point_list.length > 0) {
      point_list.push({
        ...point_list[0],
        step: point_list.length,
        point: { ...point_list[0].point },
        scaled_point: { ...point_list[0].scaled_point },
      });
    }
    const experiment_used = Boolean(
      response?.two_point_calc_newton_fallback?.used_for_newton,
    );
    return {
      cardinality: Number(
        experiment_used
          ? result?.cardinality || 0
          : response?.detection?.candidate_cardinality ||
              result?.cardinality ||
              0,
      ),
      point_list,
      elapsed_ms: Number(response?.elapsed_ms) || 0,
      detector_iterations: Number(response?.iterations) || 0,
      detector_horizon_iterations:
        Number(response?.detector_horizon_iterations) || 0,
      newton_cycles:
        result?.cycles === undefined ? undefined : Number(result.cycles) || 0,
      newton_effort: experiment_used
        ? undefined
        :
        (Number(response?.iterations) || 0) +
        (Number(
          response?.detection?.candidate_cardinality || result?.cardinality || 0,
        ) || 0) *
          (Number(result?.cycles) || 0),
      two_point_fallback: response?.two_point_calc_newton_fallback || null,
    };
  };

  test_theory = (big_points, P_coords) => {
    const point_list = big_points.point_list.slice(
      -(big_points.cardinality + 1),
    );
    console.log(`Test points ${point_list.length}`, point_list);
    const all_points = point_list.map((data) => {
      return new Complex(parseFloat(data.point.re), parseFloat(data.point.im));
    });
    const P = new Complex(P_coords.x, P_coords.y);
    let sum = new Complex(1, 0);
    for (let i = 0; i < all_points.length - 1; i++) {
      sum = sum.add(all_points[i]);
    }
    const sum_squared = sum.mul(sum);
    const negative_sum = sum.scale(-1);
    const sum_squared_add_P = sum_squared.add(P);
    const sum_squared_minus_sum = sum_squared.add(negative_sum);
    const sum_squared_minus_sum_add_P = sum_squared_minus_sum.add(P);
    console.log(
      "test_theory, sum, sum_squared_add_P, sum_squared_minus_sum_add_P",
      sum.toString(),
      sum_squared_add_P.toString(),
      sum_squared_minus_sum_add_P.toString(),
    );
  };

  on_chart_update = (key, value) => {
    const { in_fetch } = this.state;
    if (in_fetch) {
      this.pending_chart_update = { key, value };
      return;
    }
    this.pending_chart_update = null;
    const request_id = (this.seed_survey_request_id || 0) + 1;
    this.seed_survey_request_id = request_id;
    if (this.seed_survey_poll_timer) {
      clearTimeout(this.seed_survey_poll_timer);
      this.seed_survey_poll_timer = null;
    }
    this.setState({ in_fetch: true });
    DataBackend.get_orbitals(value.focal_point, 50000, (all_results) => {
      if (request_id !== this.seed_survey_request_id || !this.is_mounted) {
        return;
      }
      if (all_results.error) {
        console.log("get_orbitals error", all_results.error);
        this.finish_chart_request(request_id);
        return;
      }
      const { pro_derived } = all_results.result;
      const seed_survey = all_results.result.seed_survey || {
        stable_count: 0,
        total_samples: 0,
        stable_points: [],
        unresolved_points: [],
      };
      this.setState({
        pro_derived,
        seed_survey,
        newton_derived: { cardinality: 0, point_list: [], elapsed_ms: 0 },
      });
      if (seed_survey.job_id) {
        this.poll_seed_survey(seed_survey.job_id, request_id);
      }
      this.load_detected_newton(value.focal_point, request_id);
    });
  };

  poll_seed_survey = (job_id, request_id) => {
    DataBackend.get_seed_survey_job(job_id, (job) => {
      if (request_id !== this.seed_survey_request_id || !this.is_mounted) {
        return;
      }
      if (job.error) {
        this.setState((state) => ({
          seed_survey: { ...state.seed_survey, status: "failed", error: job.error },
        }));
        return;
      }
      if (job.status === "completed") {
        this.setState({ seed_survey: job.result });
        return;
      }
      if (job.status === "failed") {
        this.setState((state) => ({
          seed_survey: { ...state.seed_survey, status: job.status, error: job.error },
        }));
        return;
      }
      this.setState((state) => ({
        seed_survey: {
          ...state.seed_survey,
          status: job.status,
          progress: job.progress,
          stable_count: job.progress?.stable_count ?? state.seed_survey.stable_count,
          stable_points: job.progress?.stable_points ?? state.seed_survey.stable_points,
          unresolved_points:
            job.progress?.unresolved_points ?? state.seed_survey.unresolved_points,
          orbital_magnitude_range:
            job.progress?.orbital_magnitude_range ?? state.seed_survey.orbital_magnitude_range,
          outcome_counts: job.progress?.outcome_counts ?? state.seed_survey.outcome_counts,
        },
      }));
      this.seed_survey_poll_timer = setTimeout(
        () => this.poll_seed_survey(job_id, request_id),
        1000,
      );
    });
  };

  load_detected_newton = (focal_point, request_id) => {
    DataBackend.get_orbital_newton(
      focal_point,
      (response) => {
        if (request_id !== this.seed_survey_request_id || !this.is_mounted) {
          return;
        }
        if (response.error) {
          console.log("get_orbital_newton error", response.error);
          this.setState({
            newton_derived: { cardinality: 0, point_list: [], elapsed_ms: 0 },
          });
          this.finish_chart_request(request_id);
          return;
        }
        const newton_derived = this.format_detected_newton(
          response,
          focal_point,
        );
        this.setState({ newton_derived });
        this.finish_chart_request(request_id);
      },
      {
        newton_mode: "big_complex",
        adaptive_detection: true,
      },
    );
  };

  finish_chart_request = (request_id) => {
    if (request_id !== this.seed_survey_request_id || !this.is_mounted) {
      return;
    }
    this.setState({ in_fetch: false }, () => {
      if (request_id !== this.seed_survey_request_id || !this.is_mounted) {
        return;
      }
      const pending = this.pending_chart_update;
      if (pending) {
        this.pending_chart_update = null;
        this.on_chart_update(pending.key, pending.value);
      }
    });
  };

  get_chart_width_px = () => {
    const { rendered_width } = this.state;
    const splitter_pos_1 = AppSettings.get(KEY_STUDY_POINTS_SPLITTER_POS);
    const splitter_pos_2 = AppSettings.get(KEY_STUDY_SPLITTER_POS_PX);
    return (
      (rendered_width - splitter_pos_1 + splitter_pos_2 - 2 * MARGIN_PX) / 3 -
      2 * MARGIN_PX -
      5
    );
  };

  render() {
    const {
      in_fetch,
      pro_derived,
      seed_survey,
      newton_derived,
    } = this.state;
    const chart_width = this.get_chart_width_px();
    return (
      <styles.ScrollingBlock
        key={"orbitals-table"}
        style={{
          height: `${Math.max(0, this.state.rendered_height - TITLE_BAR_HEIGHT_PX)}px`,
        }}
      >
        <PointsSeriesChart
          chart_data={pro_derived.point_list}
          cardinality={pro_derived.cardinality}
          elapsed_ms={pro_derived.elapsed_ms}
          iterations={pro_derived.iterations}
          width_px={chart_width}
          waiting={!in_fetch}
          title={AppText.get(KEY_STUDY_POINTS_LEGACY_ITERATIVE)}
        />
        <SeedSurveyChart
          survey={seed_survey}
          width_px={chart_width}
          title={AppText.get(KEY_STUDY_POINTS_SEED_SURVEY)}
        />
        <PointsSeriesChart
          chart_data={newton_derived.point_list}
          cardinality={newton_derived.cardinality}
          elapsed_ms={newton_derived.elapsed_ms}
          detector_iterations={newton_derived.detector_iterations}
          detector_horizon_iterations={
            newton_derived.detector_horizon_iterations
          }
          newton_cycles={newton_derived.newton_cycles}
          newton_effort={newton_derived.newton_effort}
          two_point_fallback={newton_derived.two_point_fallback}
          width_px={chart_width}
          waiting={!in_fetch}
          title={"Newton derived"}
        />
      </styles.ScrollingBlock>
    );
  }
}

export default PointsMainPanel;
