import { service_origin } from "../utils/service_origin.jsx";
import { request_json } from "./BackendUtils.jsx";

export class ServerBackend {
  /** Fetches main-server health and dependency diagnostics.
   * @returns {Promise<Object>} Health response from GET /healthz.
   * @calledBy AdminStatus
   */
  static health = () => request_json(`${service_origin("main")}/healthz`);

  /** Fetches main-server readiness state.
   * @returns {Promise<Object>} Readiness response from GET /readyz.
   * @calledBy AdminStatus
   */
  static readiness = () => request_json(`${service_origin("main")}/readyz`);
}

export default ServerBackend;
