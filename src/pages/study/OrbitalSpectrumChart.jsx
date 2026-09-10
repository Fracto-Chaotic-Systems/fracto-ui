import React, { Component } from "react";
import PropTypes from "prop-types";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, registerables } from "chart.js";
import FractoUtil from "../../../../../sdk/FractoUtil.js";

import AppText from "../../AppText.jsx";
import DataBackend from "../../backend/DataBackend.jsx";
import CoolTree, {
  normalize_tree_data,
} from "../../utils/ui/CoolTree.jsx";
import {
  KEY_STUDY_CIRCUITRY_CARDINALITY_AXIS,
  KEY_STUDY_CIRCUITRY_POWER,
  KEY_STUDY_CIRCUITRY_SPECTRAL_POWER,
  KEY_STUDY_DETECTION_SELECTED_PATH,
  KEY_STUDY_DETECTION_SELECTED_TYPE,
  KEY_STUDY_DETECTION_SELECTED_VALUE,
  KEY_STUDY_DETECTION_COPY_PATH,
  KEY_STUDY_DETECTION_COPY_VALUE,
  KEY_STUDY_DETECTION_COPY_JSON,
  KEY_STUDY_DETECTION_COPIED,
  KEY_STUDY_DETECTION_COPY_FAILED,
} from "../../text/StudyText.jsx";

ChartJS.register(...registerables);

const format_selected_value = (value) => {
  if (value !== null && typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

const peak_fraction_labels_plugin = {
  id: "peak-fraction-labels",
  afterDraw: (chart) => {
    const dataset = chart.data.datasets[0];
    const labels = dataset?.fraction_labels || [];
    const bars = chart.getDatasetMeta(0).data;
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.fillStyle = "#444444";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    bars.forEach((bar, index) => {
      const label = labels[index];
      if (!label) return;
      ctx.fillText(label, bar.x, chartArea.bottom + 8);
    });
    ctx.restore();
  },
};

/** Render the complete spectral power series for one detector focal point. */
export class OrbitalSpectrumChart extends Component {
  static propTypes = {
    focal_point: PropTypes.object,
    height_px: PropTypes.number.isRequired,
    width_px: PropTypes.number.isRequired,
    editable: PropTypes.bool,
  };

  static defaultProps = {
    editable: false,
  };

  state = {
    spectrum_data: null,
    selected_tree_node: null,
    copy_status: null,
  };

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
      this.setState({
        spectrum_data: null,
        selected_tree_node: null,
        copy_status: null,
      });
      return;
    }
    DataBackend.get_orbital_spectrum(focal_point, (response) => {
      this.setState({
        spectrum_data: response.error ? null : response,
        selected_tree_node: null,
        copy_status: null,
      });
    });
  };

  on_tree_select = (selected_keys, selection) => {
    const selected_tree_node = selection.items.at(-1) || null;
    this.setState({ selected_tree_node, copy_status: null });
  };

  on_tree_rename = (item_key, name, details) => {
    const node = details.item?.data;
    const path_segments = node?.metadata?.path_segments || [];
    if (!node || path_segments.length === 0) return;
    const updated_data = JSON.parse(JSON.stringify(this.state.spectrum_data));
    const edited_segment = path_segments.at(-1);
    let parent = updated_data;
    for (const segment of path_segments.slice(0, -1)) {
      parent = parent[segment];
    }
    if (node.metadata.property_name !== undefined) {
      const new_property_name = name.trim();
      if (
        !new_property_name ||
        (new_property_name !== edited_segment &&
          Object.prototype.hasOwnProperty.call(parent, new_property_name))
      ) {
        return;
      }
      parent[new_property_name] = parent[edited_segment];
      if (new_property_name !== edited_segment) {
        delete parent[edited_segment];
      }
    } else {
      const parsed_value = this.parse_edited_value(node.type, name);
      if (!parsed_value.valid) return;
      parent[edited_segment] = parsed_value.value;
    }
    this.setState({
      spectrum_data: updated_data,
      selected_tree_node: null,
      copy_status: null,
    });
  };

  parse_edited_value = (type, text) => {
    if (type === "string") return { valid: true, value: text };
    if (type === "number") {
      const value = Number(text.trim());
      return { valid: Number.isFinite(value), value };
    }
    if (type === "boolean") {
      const normalized = text.trim().toLowerCase();
      if (normalized === "true") return { valid: true, value: true };
      if (normalized === "false") return { valid: true, value: false };
      return { valid: false, value: null };
    }
    if (type === "null") {
      return { valid: text.trim().toLowerCase() === "null", value: null };
    }
    return { valid: false, value: null };
  };

  copy_selected_text = async (text) => {
    try {
      const copy_text = String(text);
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copy_text);
      } else {
        const text_area = document.createElement("textarea");
        text_area.value = copy_text;
        text_area.style.position = "fixed";
        text_area.style.opacity = "0";
        document.body.appendChild(text_area);
        text_area.select();
        document.execCommand("copy");
        document.body.removeChild(text_area);
      }
      this.setState({ copy_status: "copied" });
    } catch (error) {
      console.error("Unable to copy selected tree content", error);
      this.setState({ copy_status: "failed" });
    }
  };

  render_selection_details = () => {
    const { selected_tree_node } = this.state;
    if (!selected_tree_node) return null;
    const detail_row_style = {
      display: "flex",
      gap: "0.5rem",
      alignItems: "baseline",
      marginBottom: "0.25rem",
    };
    const detail_label_style = {
      minWidth: "4rem",
      fontWeight: "bold",
      color: "#555555",
    };
    const value_text = format_selected_value(selected_tree_node.value);
    const json_text = JSON.stringify(selected_tree_node.value, null, 2);
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: "0.5rem",
          borderLeft: "1px solid #cccccc",
          boxSizing: "border-box",
          overflow: "auto",
          textAlign: "left",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            marginBottom: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            title={AppText.get(KEY_STUDY_DETECTION_COPY_PATH)}
            onClick={() =>
              this.copy_selected_text(selected_tree_node.path)
            }
          >
            {AppText.get(KEY_STUDY_DETECTION_COPY_PATH)}
          </button>
          <button
            type="button"
            title={AppText.get(KEY_STUDY_DETECTION_COPY_VALUE)}
            onClick={() => this.copy_selected_text(value_text)}
          >
            {AppText.get(KEY_STUDY_DETECTION_COPY_VALUE)}
          </button>
          <button
            type="button"
            title={AppText.get(KEY_STUDY_DETECTION_COPY_JSON)}
            onClick={() => this.copy_selected_text(json_text)}
          >
            {AppText.get(KEY_STUDY_DETECTION_COPY_JSON)}
          </button>
          {this.state.copy_status ? (
            <span style={{ alignSelf: "center", color: "#555555" }}>
              {AppText.get(
                this.state.copy_status === "copied"
                  ? KEY_STUDY_DETECTION_COPIED
                  : KEY_STUDY_DETECTION_COPY_FAILED,
              )}
            </span>
          ) : null}
        </div>
        <div style={detail_row_style}>
          <span style={detail_label_style}>
            {AppText.get(KEY_STUDY_DETECTION_SELECTED_PATH)}
          </span>
          <span style={{ fontFamily: "monospace" }}>
            {selected_tree_node.path}
          </span>
        </div>
        <div style={detail_row_style}>
          <span style={detail_label_style}>
            {AppText.get(KEY_STUDY_DETECTION_SELECTED_TYPE)}
          </span>
          <span>{selected_tree_node.type}</span>
        </div>
        <div style={{ ...detail_row_style, marginBottom: 0 }}>
          <span style={detail_label_style}>
            {AppText.get(KEY_STUDY_DETECTION_SELECTED_VALUE)}
          </span>
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              overflow: "auto",
              fontFamily: "monospace",
            }}
          >
            {format_selected_value(selected_tree_node.value)}
          </pre>
        </div>
      </div>
    );
  };

  render() {
    const { height_px, width_px, editable } = this.props;
    const peak_points =
      this.state.spectrum_data?.spectrum?.peaks
        ?.map((peak) => ({
          x: peak.cardinality,
          y: peak.power,
          cycles: peak.cycles,
        }))
        .filter(
          (point) => Number.isInteger(point.x) && Number.isFinite(point.y),
        )
        .sort((left, right) => left.x - right.x) || [];
    if (peak_points.length === 0) return null;
    const json_height_px = Math.max(120, height_px - 8);
    const tree_data = normalize_tree_data(this.state.spectrum_data);
    const selection_details = this.render_selection_details();
    const minimum_cardinality = Math.max(1, peak_points[0].x);
    const maximum_cardinality = Math.max(
      minimum_cardinality,
      peak_points.at(-1).x,
    );
    const cardinality_power = peak_points.map((point) => ({
      x: point.x,
      y: point.y,
    }));
    return (
      <div style={{ width: `${width_px}px` }}>
        <div style={{ height: `${height_px}px` }}>
          <Bar
            data={{
              datasets: [
                {
                  label: AppText.get(KEY_STUDY_CIRCUITRY_SPECTRAL_POWER),
                  data: cardinality_power,
                  fraction_labels: peak_points.map(
                    (point) => `${point.cycles ?? "?"}/${point.x}`,
                  ),
                  borderColor: peak_points.map((point) =>
                    FractoUtil.fracto_pattern_color(point.x),
                  ),
                  backgroundColor: peak_points.map((point) =>
                    FractoUtil.fracto_pattern_color(point.x),
                  ),
                  borderWidth: 1,
                  barThickness: 25,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              parsing: false,
              layout: { padding: { bottom: 28 } },
              scales: {
                x: {
                  type: "logarithmic",
                  min: minimum_cardinality * 0.9,
                  max: maximum_cardinality * 1.1,
                  ticks: { display: false },
                  title: {
                    display: true,
                    text: AppText.get(KEY_STUDY_CIRCUITRY_CARDINALITY_AXIS),
                  },
                },
                y: {
                  type: "logarithmic",
                  title: {
                    display: true,
                    text: AppText.get(KEY_STUDY_CIRCUITRY_POWER),
                  },
                },
              },
              plugins: { legend: { display: false } },
            }}
            plugins={[peak_fraction_labels_plugin]}
          />
        </div>
        <div
          style={{
            height: `${json_height_px}px`,
            overflow: "hidden",
            margin: "0.5rem 0 0",
            padding: "0.5rem",
            boxSizing: "border-box",
            backgroundColor: "#f8f8f8",
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              height: "100%",
              width: "100%",
            }}
          >
            <div
              style={{
                flex: "1 1 0",
                minWidth: 0,
                height: "100%",
              }}
            >
              <CoolTree
                tree_data={tree_data}
                default_expanded_keys={["root"]}
                on_select={this.on_tree_select}
                editable={editable}
                on_rename={this.on_tree_rename}
              />
            </div>
            {selection_details ? (
              <div style={{ flex: "0 0 35%", minWidth: 0 }}>
                {selection_details}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}

export default OrbitalSpectrumChart;
