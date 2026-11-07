import { Component } from "react";
import PropTypes from "prop-types";
import AdminBackend from "../../backend/AdminBackend.jsx";
import CoolButton from "../../utils/ui/CoolButton.jsx";
import {
  DATABASE_SYNC_TEXT as text,
  MESH_SYNC_TEXT,
} from "../../text/AdminText.jsx";

const normalize = (url) => url.replace(/\/+$/, "");
const cell = {
  textAlign: "left",
  padding: "0.35rem 0.7rem",
  borderBottom: "1px solid #ddd",
};
const error_message = (error, copy = text) =>
  Object.entries(copy.errors).find(
    ([code]) => code !== "default" && String(error).includes(code),
  )?.[1] || copy.errors.default;

export default class AdminDatabaseSync extends Component {
  static propTypes = {
    server_url: PropTypes.string.isRequired,
    kind: PropTypes.oneOf(["database", "meshes"]),
  };
  get copy() {
    return this.props.kind === "meshes" ? MESH_SYNC_TEXT : text;
  }
  api = (action, ...args) =>
    AdminBackend[
      `${this.props.kind === "meshes" ? "mesh_sync" : "database_sync"}_${action}`
    ](...args);
  state = {
    configured: false,
    loading: true,
    pending: false,
    job: null,
    preferred: "",
    error: null,
  };
  componentDidMount() {
    this.active = true;
    this.storage_key = `${this.props.kind === "meshes" ? "mesh-sync" : "database-sync"}:${normalize(this.props.server_url)}`;
    try {
      this.job_id = sessionStorage.getItem(this.storage_key);
    } catch {
      /* Storage may be unavailable. */
    }
    this.load_peers();
    this.refresh();
    this.timer = setInterval(this.refresh, 1000);
  }
  componentWillUnmount() {
    this.active = false;
    clearInterval(this.timer);
  }
  remember = (id) => {
    this.job_id = id;
    try {
      sessionStorage.setItem(this.storage_key, id);
    } catch {
      /* Polling still works without storage. */
    }
  };
  load_peers = async () => {
    try {
      const result = await this.api("peers");
      if (this.active)
        this.setState({
          configured: result.peers.includes(normalize(this.props.server_url)),
          loading: false,
        });
    } catch (error) {
      if (this.active)
        this.setState({
          loading: false,
          error: error_message(error, this.copy),
        });
    }
  };
  refresh = async () => {
    if (
      !this.job_id ||
      this.polling ||
      ["ready", "completed", "failed", "partial"].includes(
        this.state.job?.status,
      )
    )
      return;
    this.polling = true;
    const id = this.job_id;
    try {
      const job = await this.api("job", id);
      if (this.active && this.job_id === id)
        this.setState({ job, error: null });
    } catch (error) {
      if (this.active && this.job_id === id)
        this.setState({
          error: error_message(error, this.copy),
          ...(String(error).includes("404")
            ? { job: { status: "failed" } }
            : {}),
        });
    } finally {
      this.polling = false;
    }
  };
  preview = async () => {
    if (
      this.state.pending ||
      ["checking", "applying"].includes(this.state.job?.status)
    )
      return;
    this.job_id = null;
    try {
      sessionStorage.removeItem(this.storage_key);
    } catch {
      /* Storage is optional. */
    }
    this.setState({ pending: true, error: null, preferred: "", job: null });
    try {
      const job = await this.api("preview", this.props.server_url);
      this.remember(job.id);
      if (this.active) this.setState({ job });
    } catch (error) {
      if (this.active)
        this.setState({ error: error_message(error, this.copy) });
    } finally {
      if (this.active) this.setState({ pending: false });
    }
  };
  apply = async () => {
    const { job, preferred, pending } = this.state;
    if (
      pending ||
      job?.status !== "ready" ||
      (job.conflicts.length && !preferred)
    )
      return;
    this.setState({ pending: true, error: null });
    try {
      const updated = await this.api("apply", job.id, preferred || undefined);
      if (this.active) this.setState({ job: updated });
    } catch (error) {
      // A lost POST response does not mean the server stopped applying it.
      // Poll the known job ID to recover its authoritative status.
      if (this.active)
        this.setState({
          error: error_message(error, this.copy),
          job: { ...job, status: "checking", phase: this.copy.working },
        });
    } finally {
      if (this.active) this.setState({ pending: false });
    }
  };
  render() {
    const text = this.copy;
    const { configured, loading, pending, job, preferred, error } = this.state;
    const busy = pending || ["checking", "applying"].includes(job?.status);
    return (
      <section
        aria-label={text.title}
        style={{
          borderTop: "1px solid #ccc",
          margin: "1.5rem 0",
          paddingTop: "0.75rem",
        }}
      >
        <h2>{text.title}</h2>
        <p>{text.note}</p>
        {!loading && !configured && !error && <p>{text.setup}</p>}
        <CoolButton
          content={busy ? text.working : text.preview}
          on_click={this.preview}
          disabled={!configured || busy}
        />
        {busy && (
          <div role="status" aria-live="polite">
            <progress
              aria-label={text.title}
              value={
                job?.progress?.files_total
                  ? job.progress.files_processed
                  : undefined
              }
              max={job?.progress?.files_total || undefined}
            />{" "}
            {job?.phase || text.working}
          </div>
        )}
        {job?.progress && (
          <p aria-live="polite">
            {job.progress.files_processed}/{job.progress.files_total}{" "}
            {text.files} · {job.progress.bytes_transferred}/
            {job.progress.bytes_total} {text.bytes}
          </p>
        )}
        {(error || job?.error) && (
          <p role="alert">{error || error_message(job.error, text)}</p>
        )}
        {job?.status === "partial" && <p role="alert">{text.partial}</p>}
        {job?.status === "completed" && <p role="status">{text.complete}</p>}
        {!!job?.skipped && (
          <p>
            {text.skipped} {job.skipped}
          </p>
        )}
        {job?.status === "ready" && (
          <>
            <div
              style={{
                overflowX: "auto",
                maxHeight: "20rem",
                overflowY: "auto",
                marginTop: "1rem",
              }}
            >
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    {[
                      text.table,
                      text.local_rows,
                      text.remote_rows,
                      text.merged_rows,
                    ].map((label) => (
                      <th key={label} style={cell}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {job.tables.map((table) => (
                    <tr key={table.name}>
                      {[
                        table.name,
                        table.local_rows,
                        table.remote_rows,
                        table.merged_rows,
                      ].map((v, i) => (
                        <td key={i} style={cell}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!!job.conflicts.length && (
              <>
                <p>
                  {job.conflict_count ?? job.conflicts.length} {text.conflict}.{" "}
                  {text.conflict_note}
                </p>
                {job.conflict_count > job.conflicts.length && (
                  <p>
                    {text.conflict_preview} {job.conflicts.length}/
                    {job.conflict_count}
                  </p>
                )}
                <div style={{ overflow: "auto", maxHeight: "16rem" }}>
                  <table style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {[
                          text.table,
                          text.local_key,
                          text.remote_key,
                          text.changed,
                        ].map((label) => (
                          <th key={label} style={cell}>
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {job.conflicts.map((c, i) => (
                        <tr key={i}>
                          <td style={cell}>{c.table}</td>
                          <td style={cell}>{c.local_key}</td>
                          <td style={cell}>{c.remote_key}</td>
                          <td style={cell}>{c.columns.join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <label>
                  {text.choose}{" "}
                  <select
                    aria-label={text.choose}
                    value={preferred}
                    onChange={(event) =>
                      this.setState({ preferred: event.target.value })
                    }
                  >
                    <option value="">{text.choose}</option>
                    <option value="local">{text.local}</option>
                    <option value="remote">{text.remote}</option>
                  </select>
                </label>
              </>
            )}
            <p>{text.locking}</p>
            <CoolButton
              content={text.sync}
              on_click={this.apply}
              disabled={busy || (!!job.conflicts.length && !preferred)}
              primary
            />
          </>
        )}
      </section>
    );
  }
}
