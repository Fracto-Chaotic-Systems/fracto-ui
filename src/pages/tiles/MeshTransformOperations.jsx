import React, { Component } from "react";
import PropTypes from "prop-types";
import TilesBackend from "../../backend/TilesBackend.jsx";
import { PAGE_MODE_OPERATOR } from "../utils/PageAutomation.jsx";
import MeshTransformOperationsView from "./MeshTransformOperationsView.jsx";

const ACTIVE = ["queued", "running", "stopping"];
export default class MeshTransformOperations extends Component {
  static propTypes = {
    selection: PropTypes.object.isRequired,
    automation_mode: PropTypes.string,
    on_busy_change: PropTypes.func.isRequired,
    on_change: PropTypes.func.isRequired,
    on_close: PropTypes.func.isRequired,
  };
  static defaultProps = { automation_mode: PAGE_MODE_OPERATOR };
  state = {
    job: null,
    starting: false,
    stopping: false,
    saved_before: 0,
    error_key: null,
  };
  alive = false;
  sequence = 0;
  requests = new Set();
  componentDidMount() {
    this.alive = true;
  }
  componentDidUpdate(previous) {
    if (
      previous.automation_mode !== this.props.automation_mode &&
      this.props.automation_mode !== PAGE_MODE_OPERATOR &&
      ACTIVE.includes(this.state.job?.status)
    )
      this.stop();
  }
  componentWillUnmount() {
    this.alive = false;
    this.sequence++;
    clearTimeout(this.timer);
    for (const request of this.requests) request.abort();
  }
  current = (sequence) => this.alive && sequence === this.sequence;
  call = async (operation) => {
    const request = new AbortController();
    this.requests.add(request);
    const timeout = setTimeout(() => request.abort(), 20000);
    try {
      return await operation({ signal: request.signal });
    } finally {
      clearTimeout(timeout);
      this.requests.delete(request);
    }
  };
  accept = (job, sequence) => {
    if (!this.current(sequence)) return;
    clearTimeout(this.timer);
    this.setState(
      { job, starting: false, stopping: false, error_key: null },
      () => {
        const active = ACTIVE.includes(job.status);
        this.props.on_busy_change(active);
        if (active) {
          if (this.props.automation_mode !== PAGE_MODE_OPERATOR) this.stop();
          else this.timer = setTimeout(this.poll, 800);
        } else this.props.on_change();
      },
    );
  };
  start = async () => {
    if (
      !this.alive ||
      this.props.automation_mode !== PAGE_MODE_OPERATOR ||
      this.state.starting ||
      ACTIVE.includes(this.state.job?.status)
    )
      return;
    const saved =
      this.state.saved_before +
      (this.state.job?.created || 0) +
      (this.state.job?.reused || 0);
    const count = this.props.selection.count - saved;
    if (count <= 0) return;
    const sequence = ++this.sequence;
    clearTimeout(this.timer);
    this.setState({
      starting: true,
      stopping: false,
      saved_before: saved,
      job: null,
      error_key: null,
    });
    this.props.on_busy_change(true);
    try {
      const { level, region } = this.props.selection;
      const { job } = await this.call((options) =>
        TilesBackend.start_mesh_transform({ count, level, region }, options),
      );
      this.accept(job, sequence);
    } catch (error) {
      if (!this.current(sequence)) return;
      this.setState({
        starting: false,
        error_key: error.message.includes("HTTP 409") ? "changed" : "error",
      });
      this.props.on_busy_change(false);
      this.props.on_change();
    }
  };
  poll = async () => {
    const sequence = this.sequence,
      id = this.state.job?.id;
    if (!this.alive || !id || this.state.stopping) return;
    try {
      const { job } = await this.call((options) =>
        TilesBackend.terrain_cache_job(id, options),
      );
      this.accept(job, sequence);
    } catch (error) {
      if (!this.current(sequence)) return;
      if (error.message.includes("HTTP 404")) {
        this.setState({
          job: { ...this.state.job, status: "failed" },
          error_key: "lost",
        });
        this.props.on_busy_change(false);
        this.props.on_change();
      } else {
        this.setState({ error_key: "error" });
        this.timer = setTimeout(this.poll, 1500);
      }
    }
  };
  stop = async () => {
    if (!this.alive || !this.state.job?.id || this.state.stopping) return;
    const sequence = ++this.sequence;
    clearTimeout(this.timer);
    this.setState({ stopping: true, error_key: null });
    try {
      const { job } = await this.call((options) =>
        TilesBackend.stop_mesh_transform(this.state.job.id, options),
      );
      this.accept(job, sequence);
    } catch {
      if (!this.current(sequence)) return;
      this.setState({ stopping: false, error_key: "error" });
      this.timer = setTimeout(this.poll, 1500);
    }
  };
  render() {
    return (
      <MeshTransformOperationsView
        {...this.state}
        selection={this.props.selection}
        operator={this.props.automation_mode === PAGE_MODE_OPERATOR}
        on_start={this.start}
        on_stop={this.stop}
        on_close={this.props.on_close}
      />
    );
  }
}
