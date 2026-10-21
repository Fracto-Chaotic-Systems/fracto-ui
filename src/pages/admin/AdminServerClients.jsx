import { Component } from "react";
import PropTypes from "prop-types";
import AppText from "../../AppText.jsx";
import {
  KEY_ADMIN_SERVERS_CLIENTS_TITLE,
  KEY_ADMIN_SERVERS_CLIENTS_NOTE,
  KEY_ADMIN_SERVERS_CLIENTS_LOADING,
  KEY_ADMIN_SERVERS_CLIENTS_EMPTY,
  KEY_ADMIN_SERVERS_CLIENTS_ERROR,
  KEY_ADMIN_SERVERS_CLIENTS_USER,
  KEY_ADMIN_SERVERS_CLIENTS_BROWSER,
  KEY_ADMIN_SERVERS_CLIENTS_STARTED,
  KEY_ADMIN_SERVERS_CLIENTS_SEEN,
  KEY_ADMIN_SERVERS_CLIENTS_EXPIRES,
  KEY_ADMIN_SERVERS_CLIENTS_REFRESH,
  KEY_ADMIN_SERVERS_ROLE_LABEL,
  KEY_ADMIN_SERVERS_UNAVAILABLE,
} from "../../text/AdminText.jsx";
import ServerBackend from "../../backend/ServerBackend.jsx";
import CoolButton from "../../utils/ui/CoolButton.jsx";
import AdminServerTime from "./AdminServerTime.jsx";

const cell = {
  padding: "0.4rem",
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  verticalAlign: "top",
};
export default class AdminServerClients extends Component {
  static propTypes = { server_url: PropTypes.string };
  state = { clients: null, loading: true, error: false };
  componentDidMount() {
    this.active = true;
    this.refresh();
    this.timer = setInterval(this.refresh, 5000);
  }
  componentWillUnmount() {
    this.active = false;
    clearInterval(this.timer);
  }
  refresh = async () => {
    if (this.pending) return;
    this.pending = true;
    try {
      const result = this.props.server_url
        ? await ServerBackend.clients_at(this.props.server_url)
        : await ServerBackend.clients();
      if (result?.contract_version !== 1 || !Array.isArray(result.clients))
        throw Error("Invalid client snapshot");
      if (this.active)
        this.setState({
          clients: result.clients,
          loading: false,
          error: false,
        });
    } catch {
      if (this.active)
        this.setState({ clients: null, loading: false, error: true });
    } finally {
      this.pending = false;
    }
  };
  render() {
    const { clients, loading, error } = this.state;
    const unknown = AppText.get(KEY_ADMIN_SERVERS_UNAVAILABLE);
    const time = (value) => (
      <AdminServerTime href={`#server-time/${value}`}>{value}</AdminServerTime>
    );
    return (
      <section style={{ marginTop: "1rem" }}>
        <h2>{AppText.get(KEY_ADMIN_SERVERS_CLIENTS_TITLE)}</h2>
        <p>{AppText.get(KEY_ADMIN_SERVERS_CLIENTS_NOTE)}</p>
        <CoolButton
          content={AppText.get(KEY_ADMIN_SERVERS_CLIENTS_REFRESH)}
          on_click={this.refresh}
        />
        {loading && (
          <p role="status">{AppText.get(KEY_ADMIN_SERVERS_CLIENTS_LOADING)}</p>
        )}
        {error && (
          <p role="status">{AppText.get(KEY_ADMIN_SERVERS_CLIENTS_ERROR)}</p>
        )}
        {clients?.length === 0 && (
          <p>{AppText.get(KEY_ADMIN_SERVERS_CLIENTS_EMPTY)}</p>
        )}
        {!!clients?.length && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  {[
                    KEY_ADMIN_SERVERS_CLIENTS_USER,
                    KEY_ADMIN_SERVERS_ROLE_LABEL,
                    KEY_ADMIN_SERVERS_CLIENTS_BROWSER,
                    KEY_ADMIN_SERVERS_CLIENTS_STARTED,
                    KEY_ADMIN_SERVERS_CLIENTS_SEEN,
                    KEY_ADMIN_SERVERS_CLIENTS_EXPIRES,
                  ].map((key) => (
                    <th key={key} scope="col" style={cell}>
                      {AppText.get(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td style={cell}>
                      {client.user?.display_name || client.user?.id || unknown}
                    </td>
                    <td style={cell}>{client.user?.role || unknown}</td>
                    <td
                      style={{
                        ...cell,
                        maxWidth: "22rem",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {client.user_agent || unknown}
                    </td>
                    <td style={cell}>{time(client.created_at)}</td>
                    <td style={cell}>{time(client.last_seen_at)}</td>
                    <td style={cell}>{time(client.expires_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }
}
