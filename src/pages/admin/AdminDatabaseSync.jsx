import { Component } from "react";
import PropTypes from "prop-types";
import AdminBackend from "../../backend/AdminBackend.jsx";
import CoolButton from "../../utils/ui/CoolButton.jsx";
import { DATABASE_SYNC_TEXT as text } from "../../text/AdminText.jsx";

const normalize = (url) => url.replace(/\/+$/, "");
const cell = {
  textAlign: "left",
  padding: "0.35rem 0.7rem",
  borderBottom: "1px solid #ddd",
};
const error_message = (error) =>
  Object.entries(text.errors).find(
    ([code]) => code !== "default" && String(error).includes(code),
  )?.[1] || text.errors.default;

export default class AdminDatabaseSync extends Component {
  static propTypes = { server_url: PropTypes.string.isRequired };
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
    this.storage_key = `database-sync:${normalize(this.props.server_url)}`;
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
      const result = await AdminBackend.database_sync_peers();
      if (this.active)
        this.setState({
          configured: result.peers.includes(normalize(this.props.server_url)),
          loading: false,
        });
    } catch (error) {
      if (this.active)
        this.setState({ loading: false, error: error_message(error) });
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
      const job = await AdminBackend.database_sync_job(id);
      if (this.active && this.job_id === id)
        this.setState({ job, error: null });
    } catch (error) {
      if (this.active && this.job_id === id)
        this.setState({
          error: error_message(error),
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
    try { sessionStorage.removeItem(this.storage_key); } catch { /* Storage is optional. */ }
    this.setState({ pending: true, error: null, preferred: "", job: null });
    try {
      const job = await AdminBackend.database_sync_preview(
        this.props.server_url,
      );
      this.remember(job.id);
      if (this.active) this.setState({ job });
    } catch (error) {
      if (this.active) this.setState({ error: error_message(error) });
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
      const updated = await AdminBackend.database_sync_apply(
        job.id,
        preferred || undefined,
      );
      if (this.active) this.setState({ job: updated });
    } catch (error) {
      // A lost POST response does not mean the server stopped applying it.
      // Poll the known job ID to recover its authoritative status.
      if (this.active) this.setState({ error: error_message(error), job: { ...job, status: "checking", phase: text.working } });
    } finally {
      if (this.active) this.setState({ pending: false });
    }
  };
  render() {
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
        {!loading && !configured && <p>{text.setup}</p>}
        <CoolButton
          content={busy ? text.working : text.preview}
          on_click={this.preview}
          disabled={!configured || busy}
        />
        {busy && (
          <div role="status" aria-live="polite">
            <progress aria-label={text.title} /> {job?.phase || text.working}
          </div>
        )}
        {(error || job?.error) && (
          <p role="alert">{error || error_message(job.error)}</p>
        )}
        {job?.status === "partial" && <p role="alert">{text.partial}</p>}
        {job?.status === "completed" && <p role="status">{text.complete}</p>}
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
                  {job.conflicts.length} {text.conflict}. {text.conflict_note}
                </p>
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
