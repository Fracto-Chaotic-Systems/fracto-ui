import React, { Component } from "react";
import DataBackend from "../../../backend/DataBackend.jsx";
import PointsStoredOrbitalsView from "./PointsStoredOrbitalsView.jsx";

const selection_key = (props) =>
  JSON.stringify([
    props.selected_minibrot?.id,
    props.selected_minibrot?.core_point,
  ]);

export const selected_core_point = (selected) => {
  const core =
    typeof selected?.core_point === "string"
      ? JSON.parse(selected.core_point)
      : selected?.core_point;
  const x = core?.x ?? core?.re,
    y = core?.y ?? core?.im;
  if (
    ![x, y].every(
      (v) =>
        ["number", "string"].includes(typeof v) &&
        String(v).trim() !== "" &&
        Number.isFinite(Number(v)),
    )
  )
    throw Error("invalid_core_point");
  return { x: String(x), y: String(y) };
};

/** Selection-scoped reads and polling; server jobs continue if selection changes. */
export default class PointsStoredOrbitals extends Component {
  state = {
    status: "idle",
    orbitals: [],
    focal_point: null,
    notice: null,
    stale: false,
    progress: null,
  };
  generation = 0;
  in_calculation = false;
  componentDidMount() {
    this.is_mounted = true;
    this.load();
  }
  componentDidUpdate(previous) {
    if (selection_key(previous) !== selection_key(this.props)) this.load();
  }
  componentWillUnmount() {
    this.is_mounted = false;
    this.generation++;
    this.controller?.abort();
    clearTimeout(this.poll_timer);
  }
  current = (generation) => this.is_mounted && generation === this.generation;

  load = async (notice = null) => {
    const generation = ++this.generation;
    this.controller?.abort();
    clearTimeout(this.poll_timer);
    this.in_calculation = false;
    this.controller = new AbortController();
    this.setState({
      orbitals: [],
      notice,
      focal_point: null,
      status: "idle",
      error_kind: null,
      stale: false,
      progress: null,
    });
    if (!this.props.selected_minibrot?.id) return;
    let focal_point;
    try {
      focal_point = selected_core_point(this.props.selected_minibrot);
    } catch {
      this.setState({ status: "error", error_kind: "core" });
      return;
    }
    this.setState({ status: "loading", focal_point });
    try {
      const signal = this.controller.signal;
      // The survey view returns the complete ranked membership, including 100 results.
      const { result: headers, stale } = await DataBackend.stored_orbitals(focal_point, signal);
      if (!this.current(generation)) return;
      if (stale) this.setState({ stale: true });
      const orbitals = [];
      // Keep detail reads inside the data service's bounded connection capacity.
      for (let start = 0; start < headers.length; start += 4) {
        const batch = await Promise.all(
          headers
            .slice(start, start + 4)
            .map((header) => DataBackend.stored_orbital(header.id, signal)),
        );
        if (!this.current(generation)) return;
        orbitals.push(
          ...batch.map((response, index) => ({
            ...response.result,
            discovery_metadata:
              headers[start + index].discovery_metadata ??
              response.result.discovery_metadata,
          })),
        );
      }
      if (this.current(generation))
        this.setState({ status: "ready", orbitals });
    } catch (error) {
      if (this.current(generation) && error.name !== "AbortError")
        this.setState({ status: "error", error_kind: "load" });
    }
  };

  calculate = async () => {
    if (
      !this.is_mounted ||
      this.in_calculation ||
      !this.props.selected_minibrot?.id ||
      !this.state.focal_point
    )
      return;
    this.in_calculation = true;
    const generation = this.generation;
    this.setState({ status: "calculating", notice: null, progress: null });
    try {
      const { result } = await DataBackend.calculate_bailiwick_orbitals(
        this.props.selected_minibrot.id,
        this.controller.signal,
      );
      if (this.current(generation)) await this.poll(result.id, generation);
    } catch (error) {
      this.calculation_failed(error, generation);
    }
  };
  calculation_failed = (error, generation) => {
    if (this.current(generation) && error.name !== "AbortError") {
      this.in_calculation = false;
      this.setState({ status: "error", error_kind: "calculate" });
    }
  };
  poll = async (id, generation) => {
    if (!this.current(generation)) return;
    try {
      const { result } = await DataBackend.orbital_discovery_job(
        id,
        this.controller.signal,
      );
      if (!this.current(generation)) return;
      if (["queued", "running"].includes(result.status)) {
        this.setState({ progress: result.progress || null });
        this.poll_timer = setTimeout(() => this.poll(id, generation), 1000);
      } else if (
        ["completed", "partial"].includes(result.status) ||
        result.results?.length
      ) {
        await this.load(result.status === "completed" ? null : "partial");
      } else {
        this.calculation_failed(Error("calculation_failed"), generation);
      }
    } catch (error) {
      this.calculation_failed(error, generation);
    }
  };
  render() {
    return (
      <PointsStoredOrbitalsView
        {...this.state}
        on_calculate={this.calculate}
        on_reload={() => this.load()}
      />
    );
  }
}
