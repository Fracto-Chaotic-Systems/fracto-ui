import { Component } from "react";
import PropTypes from "prop-types";
import AdminBackend from "../../backend/AdminBackend.jsx";
import InstrumentTransferView from "./InstrumentTransferView.jsx";
import {
  transfer_active,
  transfer_can_apply,
  transfer_error_key,
  transfer_expired,
  transfer_missing_job,
} from "@fracto/sdk/music/TransferModel.js";

const normalize = (url) => url.replace(/\/+$/, "");
export default class AdminInstrumentTransfer extends Component {
  static propTypes = {
    server_url: PropTypes.string.isRequired,
    source_url: PropTypes.string.isRequired,
  };
  state = {
    configured: false,
    loading: true,
    pending: "",
    job: null,
    error: null,
    connection_error: null,
    uncertain: false,
    requires_preview: false,
    cancel_requested: false,
  };
  generation = 0;
  componentDidMount() {
    this.active = true;
    this.abort = new AbortController();
    this.storage_key = `instrument-transfer:${normalize(this.props.source_url)}:${normalize(this.props.server_url)}`;
    try {
      this.job_id = sessionStorage.getItem(this.storage_key);
    } catch {
      /* Optional storage. */
    }
    if (this.job_id) this.setState({ uncertain: true });
    void this.load_peers();
    void this.refresh(true);
    this.timer = setInterval(() => this.refresh(), 1000);
  }
  componentWillUnmount() {
    this.active = false;
    this.abort.abort();
    clearInterval(this.timer);
  }
  remember = (id) => {
    this.job_id = id;
    try {
      if (id) sessionStorage.setItem(this.storage_key, id);
      else sessionStorage.removeItem(this.storage_key);
    } catch {
      /* Polling works without storage. */
    }
  };
  accept = (job) => {
    if (
      job?.protocol_version !== 1 ||
      typeof job.id !== "string" ||
      typeof job.state !== "string"
    )
      throw Object.assign(new Error(), {
        code: "instrument_transfer_upgrade_required",
      });
    return job;
  };
  load_peers = async () => {
    if (this.loading_peers) return;
    this.loading_peers = true;
    if (this.active) this.setState({ loading: true, connection_error: null });
    try {
      const result = await AdminBackend.instrument_transfer_peers(
        this.abort.signal,
      );
      if (result?.protocol_version !== 1 || !Array.isArray(result.peers))
        throw Object.assign(new Error(), {
          code: "instrument_transfer_upgrade_required",
        });
      if (this.active)
        this.setState({
          configured: result.peers.some(
            (entry) => entry.peer === normalize(this.props.server_url),
          ),
        });
    } catch (error) {
      if (this.active)
        this.setState({
          configured: false,
          connection_error: transfer_error_key(error),
        });
    } finally {
      this.loading_peers = false;
      if (this.active) this.setState({ loading: false });
    }
  };
  refresh = async (force = false) => {
    if (
      !this.job_id ||
      this.command ||
      this.polling ||
      (!force &&
        this.state.job &&
        !this.state.uncertain &&
        !transfer_active(this.state.job) &&
        !transfer_expired(this.state.job))
    )
      return;
    this.polling = true;
    const id = this.job_id,
      generation = this.generation;
    try {
      const job = this.accept(
        await AdminBackend.instrument_transfer_job(id, this.abort.signal),
      );
      if (this.active && this.job_id === id && this.generation === generation)
        this.setState({
          job,
          uncertain: false,
          ...(this.state.requires_preview ? {} : { error: null }),
        });
    } catch (error) {
      if (this.active && this.job_id === id && this.generation === generation) {
        const missing = transfer_missing_job(error);
        if (missing) this.remember(null);
        this.setState({
          error: missing ? "error_missing" : transfer_error_key(error),
          uncertain: !missing,
          ...(missing
            ? { job: null, requires_preview: false, cancel_requested: false }
            : {}),
        });
      }
    } finally {
      this.polling = false;
    }
  };
  preview = async () => {
    if (
      this.command ||
      !this.state.configured ||
      transfer_active(this.state.job) ||
      this.state.uncertain
    )
      return;
    this.command = true;
    const generation = ++this.generation;
    this.remember(null);
    this.setState({
      pending: "preview",
      error: null,
      job: null,
      requires_preview: false,
      cancel_requested: false,
    });
    try {
      const job = this.accept(
        await AdminBackend.instrument_transfer_preview(
          normalize(this.props.server_url),
          this.abort.signal,
        ),
      );
      if (this.active && generation === this.generation) {
        this.remember(job.id);
        this.setState({ job });
      }
    } catch (error) {
      if (this.active) this.setState({ error: transfer_error_key(error) });
    } finally {
      this.command = false;
      if (this.active) this.setState({ pending: "" });
    }
  };
  apply = async () => {
    const job = this.state.job;
    if (
      this.command ||
      !this.state.configured ||
      this.state.uncertain ||
      this.state.requires_preview ||
      !transfer_can_apply(job)
    )
      return;
    this.command = true;
    ++this.generation;
    this.setState({ pending: "apply", error: null });
    try {
      const updated = this.accept(
        await AdminBackend.instrument_transfer_apply(
          job.id,
          job.plan_sha256,
          this.abort.signal,
        ),
      );
      if (this.active) this.setState({ job: updated, uncertain: false });
    } catch (error) {
      if (this.active) {
        const known_rejection = error.status >= 400 && error.status < 500;
        this.setState({
          error: transfer_error_key(error),
          uncertain: !known_rejection,
          requires_preview: known_rejection,
        });
      }
    } finally {
      this.command = false;
      if (this.active) {
        this.setState({ pending: "" });
        if (this.state.uncertain) void this.refresh(true);
      }
    }
  };
  cancel = async () => {
    const job = this.state.job;
    if (
      this.command ||
      !this.job_id ||
      this.state.cancel_requested ||
      (!this.state.uncertain && !transfer_active(job) && job?.state !== "ready")
    )
      return;
    this.command = true;
    ++this.generation;
    this.setState({ pending: "cancel", error: null });
    try {
      const updated = this.accept(
        await AdminBackend.instrument_transfer_cancel(
          this.job_id,
          this.abort.signal,
        ),
      );
      if (this.active)
        this.setState({
          job: updated,
          cancel_requested: transfer_active(updated),
          uncertain: false,
        });
    } catch (error) {
      if (this.active)
        this.setState({ error: transfer_error_key(error), uncertain: true });
    } finally {
      this.command = false;
      if (this.active) {
        this.setState({ pending: "" });
        if (this.state.uncertain) void this.refresh(true);
      }
    }
  };
  render() {
    return (
      <InstrumentTransferView
        {...this.state}
        source_url={this.props.source_url}
        server_url={this.props.server_url}
        on_preview={this.preview}
        on_apply={this.apply}
        on_cancel={this.cancel}
        on_reload={this.load_peers}
      />
    );
  }
}
