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
    selected_orbital: null,
    focal_point: null,
    notice: null,
    stale: false,
    progress: null,
    resumable: false,
    job_id: null,
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
    this.props.on_select_orbital?.(null);
    this.setState({
      orbitals: [],
      selected_orbital: null,
      notice,
      focal_point: null,
      status: "idle",
      error_kind: null,
      stale: false,
      progress: null,
      resumable: false,
      job_id: null,
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
      const { result: job } = await DataBackend.bailiwick_orbital_job(
        this.props.selected_minibrot.id,
        signal,
      );
      if (!this.current(generation)) return;
      if (job?.resumable) this.setState({ resumable: true, job_id: job.id });
      // The survey view returns the complete ranked membership, including 100 results.
      const { result: headers, stale } = await DataBackend.stored_orbitals(
        focal_point,
        signal,
      );
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
      if (this.current(generation)) {
        const selected_orbital = orbitals[0] || null;
        this.setState({ status: "ready", orbitals, selected_orbital });
        this.props.on_select_orbital?.(selected_orbital);
        if (job && ["queued", "running"].includes(job.status)) {
          this.in_calculation = true;
          this.setState({ status: "calculating", job_id: job.id });
          await this.poll(job.id, generation);
        }
      }
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
    const resume_id = this.state.resumable ? this.state.job_id : null;
    this.setState({
      status: "calculating",
      notice: null,
      progress: null,
      job_id: null,
    });
    try {
      const { result } = resume_id
        ? await DataBackend.resume_bailiwick_orbitals(
            this.props.selected_minibrot.id,
            resume_id,
            this.controller.signal,
          )
        : await DataBackend.calculate_bailiwick_orbitals(
            this.props.selected_minibrot.id,
            this.controller.signal,
          );
      if (this.current(generation)) {
        this.setState({ job_id: result.id, resumable: false });
        await this.poll(result.id, generation);
      }
    } catch (error) {
      this.calculation_failed(error, generation);
    }
  };
  cancel = async () => {
    const generation = this.generation;
    if (
      !this.state.job_id ||
      this.state.status !== "calculating" ||
      this.is_canceling
    )
      return;
    this.is_canceling = true;
    try {
      await DataBackend.cancel_bailiwick_orbitals(
        this.props.selected_minibrot.id,
        this.state.job_id,
        this.controller.signal,
      );
      if (this.current(generation)) await this.load();
    } catch (error) {
      this.calculation_failed(error, generation);
    } finally {
      this.is_canceling = false;
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
        this.setState({
          progress: {
            ...(result.progress || {}),
            stage: result.stage,
            job_status: result.status,
          },
        });
        this.poll_timer = setTimeout(() => this.poll(id, generation), 1000);
      } else if (
        ["completed", "partial"].includes(result.status) ||
        result.results?.length
      ) {
        await this.load(result.status === "completed" ? null : "partial");
      } else {
        if (result.resumable) await this.load();
        else this.calculation_failed(Error("calculation_failed"), generation);
      }
    } catch (error) {
      this.calculation_failed(error, generation);
    }
  };
  select_orbital = (orbital) => {
    this.setState({ selected_orbital: orbital });
    this.props.on_select_orbital?.(orbital);
  };

  render() {
    return (
      <PointsStoredOrbitalsView
        {...this.state}
        on_select_orbital={this.select_orbital}
        on_calculate={this.calculate}
        on_cancel={this.cancel}
        on_reload={() => this.load()}
      />
    );
  }
}
