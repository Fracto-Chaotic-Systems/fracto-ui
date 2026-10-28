import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import AppText from "../../../AppText.jsx";
import TilesBackend from "../../../backend/TilesBackend.jsx";
import { TERRAIN_CACHE_TEXT } from "../../../text/StudyText.jsx";

const CacheTest = styled.div`
  margin-top: 0.5rem;
  max-width: 36rem;
  font-size: 12px;
  button { cursor: pointer; }
  progress { display: block; width: 100%; height: 10px; margin-top: 5px; }
  p { margin: 4px 0; }
  output { font-family: monospace; overflow-wrap: anywhere; }
`;
const ACTIVE = ["starting", "queued", "running"];

/** Selected-record test only; caches remain reusable by later simulator assembly. */
export default class MinibrotTerrainCache extends Component {
  static propTypes = { bailiwick_id: PropTypes.number.isRequired };
  state = { status: "idle", job: null };
  sequence = 0;

  componentWillUnmount() { this.sequence++; clearTimeout(this.timer); }

  start = async () => {
    if (ACTIVE.includes(this.state.status)) return;
    const sequence = ++this.sequence;
    clearTimeout(this.timer);
    this.setState({ status: "starting", job: null });
    try {
      const { job } = await TilesBackend.start_terrain_cache(this.props.bailiwick_id);
      if (sequence !== this.sequence) return;
      this.accept(job, sequence);
    } catch { if (sequence === this.sequence) this.setState({ status: "failed" }); }
  };

  accept = (job, sequence) => {
    this.setState({ status: job.status, job });
    if (["queued", "running"].includes(job.status)) this.timer = setTimeout(() => this.poll(job.id, sequence), 800);
  };

  poll = async (id, sequence) => {
    try {
      const { job } = await TilesBackend.terrain_cache_job(id);
      if (sequence !== this.sequence) return;
      this.accept(job, sequence);
    } catch { if (sequence === this.sequence) this.setState({ status: "failed" }); }
  };

  render() {
    const { status, job } = this.state;
    const result = job?.result;
    const active = ACTIVE.includes(status);
    return <CacheTest>
      <button type="button" onClick={this.start} disabled={active}>{AppText.get(TERRAIN_CACHE_TEXT.run)}</button>
      {status !== "idle" && <p role="status">{AppText.get(TERRAIN_CACHE_TEXT[status])}</p>}
      {active && <progress max={job?.total || 1} value={job?.processed ?? undefined}
        aria-label={AppText.get(TERRAIN_CACHE_TEXT.running)} />}
      {job && <p><output>{job.processed} / {job.total}</output> {AppText.get(TERRAIN_CACHE_TEXT.tiles)}
        {` · ${AppText.get(TERRAIN_CACHE_TEXT.level)} ${job.level}`}
        {` · ${job.native_resolution.x} × ${job.native_resolution.y}`}</p>}
      {result && <>
        <p>{AppText.get(TERRAIN_CACHE_TEXT.created)}: <output>{result.created}</output>
          {` · ${AppText.get(TERRAIN_CACHE_TEXT.reused)}: ${result.reused}`}
          {` · ${AppText.get(TERRAIN_CACHE_TEXT.missing)}: ${result.missing + result.failed}`}
          {` · ${(result.compressed_bytes / 1048576).toFixed(2)} MiB`}</p>
        <p>{AppText.get(TERRAIN_CACHE_TEXT.manifest)}: <output>{result.manifest}</output></p>
      </>}
    </CacheTest>;
  }
}
