import { service_origin } from "../utils/service_origin.jsx";
import { request_json } from "./BackendUtils.jsx";

export class ServerBackend {
  /** Fetches main-server health and dependency diagnostics.
   * @returns {Promise<Object>} Health response from GET /healthz.
   * @calledBy AdminStatus
   */
  static health = () =>
    request_json(`${service_origin("main")}/healthz`, {
      credentials: "omit",
    });

  /** Fetches public health data from another Fracto main server.
   * @param {string} server_url Normalized base URL for the remote server.
   * @returns {Promise<Object>} Health contract returned by the remote server.
   * @calledBy AdminServers
   */
  static health_at = (server_url) => {
    const base_url = server_url.replace(/\/+$/, "");
    return request_json(`${base_url}/healthz`, {
      credentials: "omit",
      signal: AbortSignal.timeout(4000),
    });
  };

  /** Fetches main-server readiness state.
   * @returns {Promise<Object>} Readiness response from GET /readyz.
   * @calledBy AdminStatus
   */
  static readiness = () =>
    request_json(`${service_origin("main")}/readyz`, {
      credentials: "omit",
    });
}

export default ServerBackend;
