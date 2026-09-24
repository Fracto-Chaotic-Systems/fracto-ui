import { service_origin } from "../utils/service_origin.jsx";
import { request_json } from "./BackendUtils.jsx";

export class LogsBackend {
  /** Loads a service log stream.
   * @param {string} service_name Service name hosting GET /logs.
   * @returns {Promise<Object>} Log payload containing lines, records, and filename.
   * @calledBy LogViewer through console_render.load_logs_data
   * @note The caller supplies the service port so one client supports all log views.
   */
  static load = (service_name) => request_json(`${service_origin(service_name)}/logs`);
}

export default LogsBackend;
