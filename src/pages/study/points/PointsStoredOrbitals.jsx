import React, { Component } from "react";
import DataBackend from "../../../backend/DataBackend.jsx";
import PointsStoredOrbitalsView from "./PointsStoredOrbitalsView.jsx";
import { orbital_selectable } from "./PointsOrbitalState.js";
import { compare_orbitals } from "./PointsOrbitalOrder.js";

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
    coverage: null,
    resumable: false,
    job_id: null,
    discovery_strategy: null,
    confirmation_repair_available: false,
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

  load = async (notice = null, preserve_selection = false) => {
    const previous_selection = preserve_selection
      ? this.state.selected_orbital
      : null;
    const generation = ++this.generation;
    this.controller?.abort();
    clearTimeout(this.poll_timer);
    this.in_calculation = false;
    this.rediscovering = false;
    this.job_details = new Map();
    this.controller = new AbortController();
    if (!preserve_selection) this.props.on_select_orbital?.(null);
    this.setState({
      orbitals: preserve_selection ? this.state.orbitals : [],
      selected_orbital: previous_selection,
      notice,
      focal_point: null,
      status: "idle",
      error_kind: null,
      stale: false,
      progress: null,
      coverage: null,
      resumable: false,
      job_id: null,
      discovery_strategy: null,
      confirmation_repair_available: false,
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
      this.setState({
        discovery_strategy: job?.discovery_strategy || null,
        confirmation_repair_available: !!job?.confirmation_repair_available,
      });
      if (job?.resumable) this.setState({ resumable: true, job_id: job.id });
      if (
        job &&
        ["queued", "running", "cancelled", "interrupted", "failed"].includes(
          job.status,
        ) &&
        Array.isArray(job.results)
      ) {
        await this.sync_job_orbitals(job, generation);
        if (!this.current(generation)) return;
        this.setState({
          status: "ready",
          coverage: job.progress?.catalog_coverage || null,
          progress: {
            ...job.progress,
            stage: job.stage,
            job_status: job.status,
          },
        });
        if (["queued", "running"].includes(job.status)) {
          this.in_calculation = true;
          this.setState({ status: "calculating", job_id: job.id });
          await this.poll(job.id, generation);
        }
        return;
      }
      // The survey view returns the complete ranked membership, including 100 results.
      const {
        result: headers,
        stale,
        coverage,
      } = await DataBackend.stored_orbitals(focal_point, signal);
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
        orbitals.sort(compare_orbitals);
        const selected_orbital =
          orbitals.find(
            (orbital) =>
              orbital.orbital_id === previous_selection?.orbital_id &&
              orbital_selectable(orbital),
          ) ||
          orbitals.find(orbital_selectable) ||
          null;
        this.setState({
          status: "ready",
          orbitals,
          selected_orbital,
          coverage: job?.progress?.catalog_coverage || coverage || null,
          progress: job?.progress
            ? { ...job.progress, stage: job.stage, job_status: job.status }
            : null,
        });
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

  // Refresh only new/changed memberships and one post-commit snapshot. A family
  // can publish its orbital just before its ratios and checkpoint commit.
  sync_job_orbitals = async (job, generation) => {
    if (!Array.isArray(job.results)) return;
    const counter = job.progress?.catalog_processed ?? 0;
    this.job_details ||= new Map();
    const orbitals = [];
    for (let start = 0; start < job.results.length; start += 4) {
      const batch = await Promise.all(
        job.results.slice(start, start + 4).map(async (row) => {
          const id = String(row.orbital_id),
            key = JSON.stringify(row),
            prior = this.job_details.get(id);
          if (
            prior?.key === key &&
            (prior.settled || prior.counter === counter)
          )
            return prior.orbital;
          const { result } = await DataBackend.stored_orbital(
            id,
            this.controller.signal,
          );
          const next = {
            ...result,
            discovery_metadata:
              row.discovery_metadata ?? result.discovery_metadata,
          };
          const orbital =
            prior && JSON.stringify(prior.orbital) === JSON.stringify(next)
              ? prior.orbital
              : next;
          if (this.current(generation))
            this.job_details.set(id, {
              key,
              counter,
              settled: prior?.key === key,
              orbital,
            });
          return orbital;
        }),
      );
      if (!this.current(generation)) return;
      orbitals.push(...batch);
    }
    if (!this.current(generation)) return;
    if (this.rediscovering) {
      const ids = new Set(orbitals.map((orbital) => orbital.orbital_id));
      orbitals.push(
        ...this.state.orbitals.filter(
          (orbital) => !ids.has(orbital.orbital_id),
        ),
      );
    }
    orbitals.sort(compare_orbitals);
    const previous = this.state.selected_orbital;
    const selected_orbital =
      orbitals.find(
        (orbital) =>
          orbital.orbital_id === previous?.orbital_id &&
          orbital_selectable(orbital),
      ) ||
      orbitals.find(orbital_selectable) ||
      null;
    this.setState({ orbitals, selected_orbital });
    if (selected_orbital !== previous)
      this.props.on_select_orbital?.(selected_orbital);
  };

  rediscover = () => this.calculate(true);
  calculate = async (fresh = false) => {
    if (
      !this.is_mounted ||
      this.in_calculation ||
      !this.props.selected_minibrot?.id ||
      !this.state.focal_point
    )
      return;
    this.in_calculation = true;
    this.rediscovering = fresh;
    if (fresh) this.job_details = new Map();
    const generation = this.generation;
    const resume_id = !fresh && this.state.resumable ? this.state.job_id : null;
    this.setState({
      status: "calculating",
      notice: null,
      progress: null,
      coverage: null,
      job_id: null,
      confirmation_repair_available: false,
    });
    try {
      const { result } = fresh
        ? await DataBackend.rediscover_bailiwick_orbitals(
            this.props.selected_minibrot.id,
            this.controller.signal,
          )
        : resume_id
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
        this.setState({
          job_id: result.id,
          resumable: false,
          discovery_strategy:
            result.discovery_strategy || this.state.discovery_strategy,
        });
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
      this.rediscovering = false;
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
        await this.sync_job_orbitals(result, generation);
        if (!this.current(generation)) return;
        this.setState({
          discovery_strategy:
            result.discovery_strategy || this.state.discovery_strategy,
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
        await this.load(result.status === "completed" ? null : "partial", true);
      } else {
        if (result.resumable) await this.load();
        else this.calculation_failed(Error("calculation_failed"), generation);
      }
    } catch (error) {
      this.calculation_failed(error, generation);
    }
  };
  select_orbital = (orbital) => {
    if (!orbital_selectable(orbital)) return;
    this.setState({ selected_orbital: orbital });
    this.props.on_select_orbital?.(orbital);
  };

  render() {
    return (
      <PointsStoredOrbitalsView
        {...this.state}
        on_select_orbital={this.select_orbital}
        on_calculate={this.calculate}
        on_rediscover={this.rediscover}
        on_cancel={this.cancel}
        on_reload={() => this.load()}
      />
    );
  }
}
