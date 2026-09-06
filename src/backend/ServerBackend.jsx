import { FRACTO_SERVER_PORT } from "../../../../constants.js";
import { service_origin } from "../utils/service_origin.jsx";
import { request_json } from "./BackendUtils.jsx";

const SERVER_ORIGIN = service_origin(FRACTO_SERVER_PORT);

export class ServerBackend {
  /** Fetches main-server health and dependency diagnostics.
   * @returns {Promise<Object>} Health response from GET /healthz.
   * @calledBy AdminStatus
   */
  static health = () => request_json(`${SERVER_ORIGIN}/healthz`);

  /** Fetches main-server readiness state.
   * @returns {Promise<Object>} Readiness response from GET /readyz.
   * @calledBy AdminStatus
   */
  static readiness = () => request_json(`${SERVER_ORIGIN}/readyz`);
}

export default ServerBackend;
