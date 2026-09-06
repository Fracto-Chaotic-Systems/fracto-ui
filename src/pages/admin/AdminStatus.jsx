import { Component } from "react";
import ReactTimeAgo from "react-time-ago";

import { ALL_SERVICES } from "../../../../../constants.js";
import CoolTable from "../../utils/ui/CoolTable.jsx";
import {
  CELL_ALIGN_LEFT,
  CELL_ALIGN_CENTER,
  CELL_TYPE_CALLBACK,
  CELL_TYPE_TEXT,
} from "../../utils/ui/styles/CoolTableStyles.jsx";
import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import {
  KEY_ADMIN_STATUS,
  KEY_ADMIN_STATUS_REFRESH,
} from "../../text/AdminText.jsx";
import ServerBackend from "../../backend/ServerBackend.jsx";

const REFRESH_INTERVAL_MS = 5000;
const ERROR_REFRESH_INTERVAL_MS = 60000;
const STATUS_COLORS = {
  healthy: "#228b22",
  ready: "#228b22",
  current: "#228b22",
  degraded: "#c47f00",
  starting: "#c47f00",
  pending: "#777777",
  failed: "#b22222",
  unavailable: "#b22222",
  "attention required": "#b22222",
};
const status_cell = (status) => {
  const value = status || "unavailable";
  return (
    <span
      style={{
        color: STATUS_COLORS[value] || STATUS_COLORS.unavailable,
        fontWeight: "bold",
      }}
    >
      {value}
    </span>
  );
};
const TABLE_COLUMNS = [
  {
    id: "service",
    label: "service:",
    type: CELL_TYPE_TEXT,
    width_px: 230,
    align: CELL_ALIGN_LEFT,
    style: {
      backgroundColor: "white",
      textTransform: "uppercase",
      fontSize: "12px",
      fontWeight: "bold",
    },
  },
  {
    id: "status",
    label: "health:",
    type: CELL_TYPE_CALLBACK,
    width_px: 180,
    align: CELL_ALIGN_CENTER,
    style: { backgroundColor: "white" },
  },
  {
    id: "detail",
    label: "revision:",
    type: CELL_TYPE_TEXT,
    width_px: 260,
    align: CELL_ALIGN_LEFT,
    style: { backgroundColor: "white" },
  },
];

export class AdminStatus extends Component {
  state = {
    health: null,
    readiness: null,
    error: null,
    updated_at: null,
    interval: null,
    refreshing: false,
  };

  componentDidMount() {
    this.refresh();
    this.set_poll_interval(REFRESH_INTERVAL_MS);
  }

  componentWillUnmount() {
    if (this.state.interval) clearInterval(this.state.interval);
    this.unmounted = true;
  }

  refresh = async () => {
    if (this.state.refreshing) return;
    this.setState({ refreshing: true });
    try {
      const [health_response, readiness_response] = await Promise.all([
        ServerBackend.health(),
        ServerBackend.readiness(),
      ]);
      const [health, readiness] = [health_response, readiness_response];
      if (!this.unmounted) {
        this.setState({
          health,
          readiness,
          error: null,
          updated_at: new Date(),
        });
        this.set_poll_interval(REFRESH_INTERVAL_MS);
      }
    } catch (error) {
      if (!this.unmounted) {
        this.setState({ error: error.message, updated_at: new Date() });
        this.set_poll_interval(ERROR_REFRESH_INTERVAL_MS);
      }
    } finally {
      if (!this.unmounted) this.setState({ refreshing: false });
    }
  };

  set_poll_interval = (interval_ms) => {
    if (this.unmounted) return;
    if (this.state.interval) clearInterval(this.state.interval);
    this.setState({ interval: setInterval(this.refresh, interval_ms) });
  };

  render() {
    const { health, readiness, error, updated_at, refreshing } = this.state;
    const services = health?.services || {};
    const build_info = health?.build_info;
    const repositories = build_info?.repositories || {};
    const repository_entries = Object.values(repositories);
    const build_status =
      build_info &&
      repository_entries.length &&
      repository_entries.every(
        (repository) => repository.revision && !repository.dirty,
      )
        ? "current"
        : "attention required";
    const rows = ALL_SERVICES.map((service) => ({
      service: service.name,
      status: [() => status_cell(services[service.name]), null],
      detail: repositories[service.name]?.short_revision || "unavailable",
    }));
    const overall_status = error
      ? "unavailable"
      : readiness?.status === "ready"
        ? "ready"
        : health?.status || "pending";
    return [
      <styles.SectionTitle key={"admin-status-title"}>
        {AppText.get(KEY_ADMIN_STATUS)}
      </styles.SectionTitle>,
      <styles.CenteredBlock key={"admin-status-content"}>
        <div style={{ margin: "0.75rem auto", fontSize: "1rem" }}>
          Overall readiness: {status_cell(overall_status)}
          {updated_at && (
            <span style={{ marginLeft: "1rem", color: "#777777" }}>
              Updated <ReactTimeAgo date={updated_at} /> (
              {updated_at.toLocaleString()})
            </span>
          )}
        </div>
        <div style={{ margin: "0.5rem auto", color: "#555555" }}>
          Build version: <strong>{build_info?.version || "unavailable"}</strong>{" "}
          (
          {build_info?.generated_at
            ? new Date(build_info.generated_at).toLocaleString()
            : "no build manifest"}
          ){" — "}
          <span
            style={{
              color: STATUS_COLORS[build_status] || STATUS_COLORS.unavailable,
              fontWeight: "bold",
            }}
          >
            {build_status}
          </span>
        </div>
        {error && (
          <>
            <div
              style={{
                color: "#b22222",
                fontStyle: "italic",
                fontWeight: "bold",
                marginBottom: "0.75rem",
              }}
            >
              Unable to reach the main health endpoint: {error}
            </div>
            <styles.ButtonBlock>
              <styles.HoverBlueButton
                onClick={this.refresh}
                disabled={refreshing}
              >
                {refreshing
                  ? "checking..."
                  : AppText.get(KEY_ADMIN_STATUS_REFRESH)}
              </styles.HoverBlueButton>
            </styles.ButtonBlock>
          </>
        )}
        <styles.TableWrapper>
          <CoolTable columns={TABLE_COLUMNS} data={rows} />
        </styles.TableWrapper>
      </styles.CenteredBlock>,
    ];
  }
}

export default AdminStatus;
