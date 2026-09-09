import React, { Component } from "react";
import PropTypes from "prop-types";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, registerables } from "chart.js";

import AppText from "../../AppText.jsx";
import DataBackend from "../../backend/DataBackend.jsx";
import {
  KEY_STUDY_CIRCUITRY_CARDINALITY_AXIS,
  KEY_STUDY_CIRCUITRY_POWER,
  KEY_STUDY_CIRCUITRY_SPECTRAL_POWER,
} from "../../text/StudyText.jsx";

ChartJS.register(...registerables);

// DFT leakage leaves tiny non-zero values across the tail. Treat values below
// this fraction of the strongest response as numerical background when
// choosing the visible cardinality span.
const SPECTRUM_DISPLAY_POWER_FLOOR_RATIO = 0.001;

/** Render the complete spectral power series for one detector focal point. */
export class OrbitalSpectrumChart extends Component {
  static propTypes = {
    focal_point: PropTypes.object,
    height_px: PropTypes.number.isRequired,
    width_px: PropTypes.number.isRequired,
  };

  state = { spectrum_data: null };

  componentDidMount() {
    this.load_spectrum(this.props.focal_point);
  }

  componentDidUpdate(previous_props) {
    const { focal_point } = this.props;
    const previous_focal_point = previous_props.focal_point;
    if (
      focal_point?.x !== previous_focal_point?.x ||
      focal_point?.y !== previous_focal_point?.y
    ) {
      this.load_spectrum(focal_point);
    }
  }

  load_spectrum = (focal_point) => {
    if (!focal_point) {
      this.setState({ spectrum_data: null });
      return;
    }
    DataBackend.get_orbital_spectrum(focal_point, (response) => {
      this.setState({ spectrum_data: response.error ? null : response });
    });
  };

  render() {
    const { height_px, width_px } = this.props;
    const raw_spectrum_points =
      this.state.spectrum_data?.spectrum?.power_spectrum
        ?.map((point) => ({
          x:
            point.frequency_cycles_per_iteration > 0
              ? 1 / point.frequency_cycles_per_iteration
              : null,
          y: point.power,
        }))
        .filter((point) => Number.isFinite(point.x))
        .filter(
          (point) =>
            point.x <=
            (this.state.spectrum_data?.spectrum
              ?.maximum_trustworthy_cardinality || Number.POSITIVE_INFINITY),
        )
        .sort((left, right) => left.x - right.x) || [];
    const maximum_power = raw_spectrum_points.reduce(
      (maximum, point) => Math.max(maximum, point.y),
      0,
    );
    const display_power_floor =
      maximum_power * SPECTRUM_DISPLAY_POWER_FLOOR_RATIO;
    const meaningful_points = raw_spectrum_points.filter(
      (point) => point.y > display_power_floor,
    );
    const highest_meaningful_cardinality = meaningful_points.reduce(
      (maximum, point) => Math.max(maximum, point.x),
      0,
    );
    const display_max_cardinality = highest_meaningful_cardinality * 1.1;
    const spectrum_points = raw_spectrum_points.filter(
      (point) => point.x <= display_max_cardinality,
    );
    if (spectrum_points.length === 0) return null;
    return (
      <div style={{ width: `${width_px}px`, height: `${height_px}px` }}>
        <Line
          data={{
            datasets: [
              {
                label: AppText.get(KEY_STUDY_CIRCUITRY_SPECTRAL_POWER),
                data: spectrum_points,
                borderColor: "#5588aa",
                backgroundColor: "rgba(85, 136, 170, 0.15)",
                pointRadius: 0,
                borderWidth: 1.5,
                tension: 0.1,
                fill: true,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            parsing: false,
            scales: {
              x: {
                type: "logarithmic",
                min: 1,
                max: display_max_cardinality || undefined,
                title: {
                  display: true,
                  text: AppText.get(KEY_STUDY_CIRCUITRY_CARDINALITY_AXIS),
                },
              },
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: AppText.get(KEY_STUDY_CIRCUITRY_POWER),
                },
              },
            },
            plugins: { legend: { display: false } },
          }}
        />
      </div>
    );
  }
}

export default OrbitalSpectrumChart;
