import React, { Component } from "react";
import PropTypes from "prop-types";
import AppText from "../../../AppText.jsx";
import { RAY_TEXT_KEYS } from "../../../text/AssetsText.jsx";

const text = (key) => AppText.get(RAY_TEXT_KEYS[key]);
const selection_key = (props) =>
  JSON.stringify([props.focal_point, props.orbital?.points]);

/** Worker ownership, cancellation, and bounded result cache for selected orbitals.
 * The numerical/published basis is documented in RAYS.md.
 */
export default class SeedSurveyRays extends Component {
  static propTypes = {
    focal_point: PropTypes.object,
    orbital: PropTypes.object,
    on_rays: PropTypes.func.isRequired,
  };
  state = { status: "idle", progress: null, result: null, visible: true };
  generation = 0;
  cache = new Map();
  componentDidMount() {
    if (this.props.orbital) this.trace();
  }
  componentDidUpdate(previous) {
    if (selection_key(previous) !== selection_key(this.props)) {
      if (this.props.orbital) this.trace();
      else {
        this.stop();
        this.props.on_rays([]);
        this.setState({ status: "idle", progress: null, result: null });
      }
    }
  }
  componentWillUnmount() {
    this.stop();
  }
  stop = () => {
    this.generation++;
    this.worker?.terminate();
    this.worker = null;
  };
  cancel = () => {
    this.stop();
    this.props.on_rays([]);
    this.setState({ status: "cancelled", result: null, progress: null });
  };
  finish = (result) => {
    this.stop();
    this.setState({ result, status: result.status, progress: null });
    this.props.on_rays(this.state.visible ? result.rays : []);
  };
  trace = () => {
    this.stop();
    this.props.on_rays([]);
    const key = selection_key(this.props);
    if (this.cache.has(key)) {
      this.finish(this.cache.get(key));
      return;
    }
    if (!this.props.orbital) {
      this.setState({ status: "no_selection" });
      return;
    }
    this.setState({ status: "running", progress: null, result: null });
    const id = this.generation;
    try {
      this.worker = new Worker(
        new URL("./SeedSurveyRays.worker.js", import.meta.url),
        { type: "module" },
      );
      this.worker.onmessage = ({ data }) => {
        if (data.id !== this.generation) return;
        if (data.error) {
          this.finish({ status: "failed", rays: [] });
          return;
        }
        if (data.progress) {
          this.setState({ progress: data.progress });
          this.props.on_rays(
            this.state.visible ? data.progress.rays || [] : [],
          );
        }
        if (data.result) {
          if (this.cache.size >= 8)
            this.cache.delete(this.cache.keys().next().value);
          this.cache.set(key, data.result);
          this.finish(data.result);
        }
      };
      this.worker.onerror = () => {
        if (id === this.generation) this.finish({ status: "failed", rays: [] });
      };
      this.worker.postMessage({
        id,
        focal_point: this.props.focal_point,
        orbital: this.props.orbital,
      });
    } catch {
      this.stop();
      this.setState({ status: "unavailable" });
    }
  };
  toggle = (event) => {
    const visible = event.target.checked;
    this.setState({ visible });
    this.props.on_rays(
      visible ? this.state.result?.rays || this.state.progress?.rays || [] : [],
    );
  };
  render() {
    const { status, progress, result, visible } = this.state;
    const running = status === "running";
    const message = text(
      status === "idle" && !this.props.orbital ? "no_selection" : status,
    );
    return (
      <div
        style={{ maxWidth: "550px", fontSize: "0.8rem", paddingTop: "0.75rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            type="button"
            disabled={running || !this.props.orbital}
            onClick={this.trace}
          >
            {text("trace")}
          </button>
          {running && (
            <button type="button" onClick={this.cancel}>
              {text("cancel")}
            </button>
          )}
          <label>
            <input type="checkbox" checked={visible} onChange={this.toggle} />
            {text("show")}
          </label>
        </div>
        <div role="status" aria-live="polite">
          {message}
        </div>
        {running && (
          <>
            <progress
              aria-label={text(progress?.stage || "classifying")}
              max={progress?.total || 1}
              value={progress?.processed || 0}
              style={{ width: "100%" }}
            />
            <div>
              {text(progress?.stage || "classifying")}
              {progress ? ` (${progress.processed}/${progress.total})` : ""}
            </div>
          </>
        )}
        {result?.rays?.length > 0 && (
          <div>
            {text("angles")}{" "}
            {result.rays.map((ray) => ray.angle.key).join(", ")}
          </div>
        )}
      </div>
    );
  }
}
