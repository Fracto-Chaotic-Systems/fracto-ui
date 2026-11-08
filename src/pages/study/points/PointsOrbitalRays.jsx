import React, { Component } from "react";
import OrbitalRayStorage from "./OrbitalRayStorage.js";
import { cached_orbital_rays } from "@fracto/sdk/orbitals/FractoOrbitalRayCache.js";
import PointsOrbitalRayProgress from "./PointsOrbitalRayProgress.jsx";

const request_key = (props) => JSON.stringify(props.trace_request);

/** Selection-owned worker; obsolete results never repaint a newer selection. */
export default class PointsOrbitalRays extends Component {
  state = {
    running: false,
    loading_cache: false,
    cache_error: false,
    processed: 0,
    total: 0,
    status: null,
  };
  generation = 0;
  componentDidMount() {
    this.is_mounted = true;
    return this.trace();
  }
  componentDidUpdate(previous) {
    if (request_key(previous) !== request_key(this.props)) return this.trace();
  }
  componentWillUnmount() {
    this.is_mounted = false;
    this.stop();
  }
  stop = () => {
    this.generation++;
    this.worker?.terminate();
    this.worker = null;
  };
  cancel = () => {
    this.stop();
    this.setState({ running: false, loading_cache: false, status: "cancelled" });
  };
  trace = async () => {
    this.stop();
    this.props.on_rays([]);
    const request = this.props.trace_request;
    const total = request?.requests?.length || 0;
    this.setState({
      running: total > 0,
      loading_cache: total > 0,
      cache_error: false,
      processed: 0,
      total,
      status: null,
    });
    if (!total) return;
    const id = this.generation;
    const key = request_key(this.props);
    let storage,
      cached = [];
    try {
      storage = new OrbitalRayStorage(request);
      cached = cached_orbital_rays(await storage.load(), request);
    } catch {
      /* Cache availability must not prevent tracing. */
    }
    if (!this.is_mounted || id !== this.generation) return;
    this.setState({ loading_cache: false });
    const displayed = new Map(cached.map((ray) => [ray.angle.key, ray]));
    const saved = new Set(displayed.keys());
    const publish = (rays) => {
      for (const ray of rays) displayed.set(ray.angle.key, ray);
      this.props.on_rays([...displayed.values()]);
    };
    publish([]);
    if (cached.length === total) {
      this.setState({
        running: false,
        status: request.rejected?.length ? "partial" : "rays_found",
      });
      return;
    }
    // Cache eligibility retains whole doubling families, so the remaining
    // accesses can be traced and validated without recalculating saved partners.
    const remaining = {
      ...request,
      requests: request.requests.filter((access) => !saved.has(access.angle.key)),
    };
    this.setState({ processed: 0, total: remaining.requests.length });
    const persist = (rays) => {
      if (!storage || !rays.some((ray) => !saved.has(ray.angle.key))) return;
      for (const ray of rays) saved.add(ray.angle.key);
      storage
        .save(rays)
        .then(() => {
          if (this.is_mounted && request_key(this.props) === key)
            this.setState({ cache_error: false });
        })
        .catch(() => {
          if (this.is_mounted && request_key(this.props) === key)
            this.setState({ cache_error: true });
        });
    };
    const finish = (status, rays) => {
      this.stop();
      this.setState({ running: false, status });
      publish(rays);
    };
    try {
      this.worker = new Worker(
        new URL("./PointsOrbitalRays.worker.js", import.meta.url),
        { type: "module" },
      );
      this.worker.onmessage = ({ data }) => {
        if (data.id !== this.generation) return;
        if (data.error) {
          finish("failed", []);
          return;
        }
        if (data.progress) {
          this.setState({
            processed: data.progress.processed,
            total: data.progress.total,
          });
          publish(data.progress.rays);
          persist(data.progress.rays);
        }
        if (data.result) {
          persist(data.result.rays);
          finish(data.result.status, data.result.rays);
        }
      };
      this.worker.onerror = () => {
        if (id === this.generation) finish("failed", []);
      };
      this.worker.postMessage({ id, request: remaining });
    } catch {
      finish("failed", []);
    }
  };
  render() {
    const { running, loading_cache, cache_error, processed, total, status } =
      this.state;
    if (!running && !cache_error && (!status || status === "rays_found"))
      return null;
    return (
      <PointsOrbitalRayProgress
        {...this.state}
        on_cancel={this.cancel}
        on_retry={this.trace}
      />
    );
  }
}
