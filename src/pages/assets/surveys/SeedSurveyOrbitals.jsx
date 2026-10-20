import React, { Component } from "react";
import PropTypes from "prop-types";
import AppText from "../../../AppText.jsx";
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import { render_pattern_block } from "../../study/StudyUtils.jsx";
import { CELL_TYPE_CALLBACK, CELL_TYPE_TEXT, TABLE_CAN_SELECT, TABLE_NO_BORDER } from "../../../utils/ui/styles/CoolTableStyles.jsx";
import { KEY_ASSETS_SURVEYS_SCAN_PROGRESS, KEY_ASSETS_SURVEYS_SCAN_WAITING, KEY_ASSETS_SURVEYS_SCAN_RUNNING, KEY_ASSETS_SURVEYS_SCAN_COMPLETE, KEY_ASSETS_SURVEYS_TABLE_PATTERN, KEY_ASSETS_SURVEYS_TABLE_CONFIDENCE, KEY_ASSETS_SURVEYS_TABLE_SEED, KEY_ASSETS_SURVEYS_TABLE_DISCOVERIES, KEY_ASSETS_SURVEYS_FAILED } from "../../../text/AssetsText.jsx";
import { scan_orbitals } from "./SeedSurveyScan.js";

/** Owns the incremental survey scan independently of hover calculations. */
export default class SeedSurveyOrbitals extends Component {
  static propTypes = { survey: PropTypes.object, selected_orbital: PropTypes.object, on_select_orbital: PropTypes.func };
  state = { orbitals: [], status: "waiting", progress: { processed: 0, total: 0 } };
  generation = 0;
  componentDidMount() { this.start_scan(); }
  componentDidUpdate(previous) { if (previous.survey !== this.props.survey) this.start_scan(); }
  componentWillUnmount() { this.generation++; }
  start_scan = async () => {
    const survey = this.props.survey;
    if (!survey) {
      this.generation++;
      this.session = null;
      this.setState({ orbitals: [], status: "waiting", progress: { processed: 0, total: 0 } });
      return;
    }
    const key = survey.request_id ?? survey;
    if (this.session?.key !== key) {
      this.generation++;
      this.session = { key, found: [], tested_pixels: new Set(), running: false, pending: null };
      this.setState({ orbitals: [], status: "running", progress: { processed: 0, total: 0 } });
    }
    const session = this.session;
    session.pending = survey;
    this.setState({ progress: { processed: session.tested_pixels.size, total: survey.cached_seeds ?? this.state.progress.total } });
    if (session.running) return;
    session.running = true;
    const generation = this.generation;
    try {
      while (session.pending && generation === this.generation) {
        const current = session.pending;
        session.pending = null;
        await scan_orbitals(current, {
          state: session,
          on_progress: progress => {
            if (generation === this.generation) this.setState({
              progress: { processed: progress.processed, total: Math.max(progress.total, progress.processed, this.state.progress.total) },
            });
          },
          cancelled: () => generation !== this.generation,
          on_result: orbitals => { if (generation === this.generation) this.setState({ orbitals }); },
        });
        if (generation === this.generation) this.setState({
          status: current.status === "failed" ? "failed" : current.complete === false ? "running" : "complete",
        });
      }
    } catch (error) {
      if (generation === this.generation) this.setState({ status: "failed" });
      console.error("Seed survey orbital scan failed", error);
    } finally {
      session.running = false;
    }
  };
  sorted_orbitals = () => [...this.state.orbitals].sort((a, b) =>
    b.discovery_count - a.discovery_count || a.orbital_id - b.orbital_id);
  on_select_row = (index) => {
    const orbital = this.sorted_orbitals()[index];
    if (orbital) this.props.on_select_orbital?.(orbital);
  };
  render() {
    const { status } = this.state;
    const progress = this.state.progress || { processed: 0, total: 0 };
    const progress_label = AppText.get(KEY_ASSETS_SURVEYS_SCAN_PROGRESS)
      .replace("${processed}", String(progress.processed))
      .replace("${total}", String(progress.total))
      .replace("${remaining}", String(Math.max(0, progress.total - progress.processed)));
    const orbitals = this.sorted_orbitals();
    const key = status === "waiting" ? KEY_ASSETS_SURVEYS_SCAN_WAITING : status === "running" ? KEY_ASSETS_SURVEYS_SCAN_RUNNING : status === "complete" ? KEY_ASSETS_SURVEYS_SCAN_COMPLETE : KEY_ASSETS_SURVEYS_FAILED;
    return <div style={{ maxWidth: "550px", fontSize: "0.8rem", paddingTop: "0.5rem" }}>
      <div>
        <div aria-live="polite">{AppText.get(key).replace("${count}", String(orbitals.length))}</div>
        <progress
          aria-label={progress_label}
          max={Math.max(1, progress.total)}
          value={progress.total ? progress.processed : status === "complete" ? 1 : 0}
          style={{ display: "block", width: "100%", height: "0.75rem", marginTop: "0.25rem" }}
        />
        <div>{progress_label}</div>
      </div>
      <CoolTable
        columns={[
          { id: "pattern", label_key: KEY_ASSETS_SURVEYS_TABLE_PATTERN, type: CELL_TYPE_CALLBACK, width_px: 75 },
          { id: "confidence", label_key: KEY_ASSETS_SURVEYS_TABLE_CONFIDENCE, type: CELL_TYPE_TEXT, width_px: 90 },
          { id: "discoveries", label_key: KEY_ASSETS_SURVEYS_TABLE_DISCOVERIES, type: CELL_TYPE_TEXT, width_px: 90 },
          { id: "seed", label_key: KEY_ASSETS_SURVEYS_TABLE_SEED, type: CELL_TYPE_TEXT, width_px: 230 },
        ]}
        data={orbitals.map(orbital => ({
          pattern: [render_pattern_block, orbital.points.length],
          confidence: `${(100 * orbital.confidence).toFixed(2)}%`,
          discoveries: String(orbital.discovery_count),
          seed: `(${Number(orbital.seed.x.toPrecision(8))}, ${Number(orbital.seed.y.toPrecision(8))})`,
        }))}
        options={[TABLE_CAN_SELECT, TABLE_NO_BORDER]}
        selected_row={this.props.selected_orbital ? orbitals.findIndex(orbital =>
          orbital === this.props.selected_orbital ||
          (this.props.selected_orbital.orbital_id !== undefined && (
            orbital.orbital_id === this.props.selected_orbital.orbital_id ||
            orbital.merged_ids?.includes(this.props.selected_orbital.orbital_id)
          ))) : -1}
        on_select_row={this.on_select_row}
      />
    </div>;
  }
}
