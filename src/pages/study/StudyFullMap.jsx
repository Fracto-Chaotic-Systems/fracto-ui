import { Component } from "react";
import styled from "styled-components";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import {
  KEY_STUDY_FULL_MAP_TITLE,
  KEY_LOGISTIC_MAP_RUN_DIAGNOSTIC,
  KEY_LOGISTIC_MAP_RUNNING,
  KEY_LOGISTIC_MAP_PROGRESS,
  KEY_LOGISTIC_MAP_STATUS,
  KEY_LOGISTIC_MAP_R,
  KEY_LOGISTIC_MAP_PERIOD,
  KEY_LOGISTIC_MAP_ITERATIONS,
  KEY_LOGISTIC_MAP_TIME,
  KEY_LOGISTIC_MAP_SPEED,
  KEY_LOGISTIC_MAP_ERROR,
} from "../../text/StudyText.jsx";
import { request_json } from "../../backend/BackendUtils.jsx";
import { service_origin } from "../../utils/service_origin.jsx";

const DiagnosticPanel = styled.div`
  padding: 1rem;
  overflow: auto;
  height: calc(100% - 2rem);
  color: #333;
`;
const RunButton = styled.button`
  padding: 0.45rem 0.8rem;
  border: 1px solid #777;
  border-radius: 3px;
  background: #f6f6f6;
  cursor: pointer;
  &:disabled { cursor: wait; opacity: 0.65; }
`;
const ProgressLine = styled.div`
  margin: 0.75rem 0;
  font-size: 0.9rem;
`;
const TableScroll = styled.div`
  max-height: 40rem;
  overflow-y: auto;
`;
const OutcomeTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
  th, td { padding: 0.3rem 0.45rem; border-bottom: 1px solid #ddd; text-align: right; }
  th { position: sticky; top: 0; background: #eee; }
  th:first-child, td:first-child, th:nth-child(2), td:nth-child(2) { text-align: left; }
`;

const text = (key, fallback) => AppText.get(key) || fallback;
const format_number = (value, digits = 6) => Number.isFinite(value)
  ? Number(Number(value).toPrecision(digits)).toString()
  : "—";

/** Temporary level-one diagnostic view; the resulting compact rows are ephemeral. */
export class StudyFullMap extends Component {
  state = { job: null, starting: false, error: null };
  poll_timer = null;
  mounted = false;

  componentDidMount() { this.mounted = true; }

  componentWillUnmount() {
    this.mounted = false;
    clearTimeout(this.poll_timer);
  }

  run_diagnostic = async () => {
    clearTimeout(this.poll_timer);
    this.setState({ starting: true, error: null, job: null });
    try {
      const job = await request_json(`${service_origin("data")}/logistic_map/level_one`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!this.mounted) return;
      this.setState({ job, starting: false });
      if (job.status === "running") this.schedule_poll(job.job_id);
    } catch (error) {
      if (this.mounted) this.setState({ starting: false, error: error.message });
    }
  };

  schedule_poll = (job_id) => {
    this.poll_timer = setTimeout(() => this.poll_job(job_id), 750);
  };

  poll_job = async (job_id) => {
    try {
      const job = await request_json(`${service_origin("data")}/logistic_map/jobs/${encodeURIComponent(job_id)}`);
      if (!this.mounted) return;
      this.setState({ job, error: null });
      if (job.status === "running") this.schedule_poll(job_id);
    } catch (error) {
      if (this.mounted) this.setState({ error: error.message });
    }
  };

  render() {
    const { job, starting, error } = this.state;
    const running = starting || job?.status === "running";
    const outcome_counts = (job?.outcomes || []).reduce((counts, outcome) => {
      counts[outcome.status] = (counts[outcome.status] || 0) + 1;
      return counts;
    }, {});
    const outcome_summary = Object.entries(outcome_counts)
      .map(([status, count]) => `${status}: ${count}`)
      .join(" · ");
    const may_show_outcomes = job?.status === "completed" || job?.status === "failed";
    return (
      <>
        <styles.SectionTitle>{AppText.get(KEY_STUDY_FULL_MAP_TITLE)}</styles.SectionTitle>
        <DiagnosticPanel>
          <RunButton disabled={running} onClick={this.run_diagnostic}>
            {running ? text(KEY_LOGISTIC_MAP_RUNNING, "calculating level 1…")
              : text(KEY_LOGISTIC_MAP_RUN_DIAGNOSTIC, "calculate initial level span")}
          </RunButton>
          {job && <ProgressLine aria-live="polite">
            {text(KEY_LOGISTIC_MAP_PROGRESS, "progress")}: {job.progress.completed} / {job.progress.total}
            {job.status === "completed" ? ` — ${text(KEY_LOGISTIC_MAP_STATUS, "completed")}` : ` — ${job.status}`}
            {may_show_outcomes && outcome_summary ? ` — ${outcome_summary}` : ""}
          </ProgressLine>}
          {job?.current && <ProgressLine aria-live="polite">
            calculating r={format_number(job.current.r, 12)}: {job.current.iterations_completed.toLocaleString()} / {job.settings.iteration_cap.toLocaleString()} iterations
          </ProgressLine>}
          {job && <ProgressLine>
            r ∈ [{job.settings.range_start}, {job.settings.range_end_exclusive}), {job.settings.divisions} bins;
            iteration cap {job.settings.iteration_cap.toLocaleString()}, transient {job.settings.transient_limit.toLocaleString()}
            {job.duration_ms !== null ? `; worker time ${format_number(job.duration_ms, 6)} ms` : ""}
          </ProgressLine>}
          {error && <ProgressLine role="alert">{text(KEY_LOGISTIC_MAP_ERROR, "error")}: {error}</ProgressLine>}
          {job?.error && <ProgressLine role="alert">{job.error}</ProgressLine>}
          {may_show_outcomes && job.outcomes.length > 0 && <TableScroll>
            <OutcomeTable>
            <thead><tr>
              <th>{text(KEY_LOGISTIC_MAP_R, "r")}</th>
              <th>{text(KEY_LOGISTIC_MAP_STATUS, "outcome")}</th>
              <th>{text(KEY_LOGISTIC_MAP_PERIOD, "period")}</th>
              <th>{text(KEY_LOGISTIC_MAP_ITERATIONS, "iterations")}</th>
              <th>{text(KEY_LOGISTIC_MAP_TIME, "time (ms)")}</th>
              <th>{text(KEY_LOGISTIC_MAP_SPEED, "iterations/s")}</th>
            </tr></thead>
            <tbody>{job.outcomes.map((outcome) => <tr key={outcome.index}>
              <td>{format_number(outcome.r, 12)}</td>
              <td>{outcome.status}</td>
              <td>{outcome.period ?? "—"}</td>
              <td>{outcome.iterations_completed.toLocaleString()}</td>
              <td>{format_number(outcome.timing?.total_ms, 5)}</td>
              <td>{outcome.timing?.iterations_per_second?.toLocaleString() ?? "—"}</td>
            </tr>)}</tbody>
            </OutcomeTable>
          </TableScroll>}
        </DiagnosticPanel>
      </>
    );
  }
}

export default StudyFullMap;
