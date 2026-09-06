import { FRACTO_ADMIN_PORT } from "../../../../constants.js";
import { service_origin } from "../utils/service_origin.jsx";
import { request_json } from "./BackendUtils.jsx";

const ADMIN_ORIGIN = service_origin(FRACTO_ADMIN_PORT);

export class AdminBackend {
  /** Fetches recent commits from all allowlisted Fracto repositories.
   * @param {number} limit Maximum number of aggregate commits to return.
   * @returns {Promise<{commits: Array}>} Date-descending normalized commit summaries.
   * @calledBy AdminCommits componentDidMount.
   */
  static commits = (limit = 100) =>
    request_json(`${ADMIN_ORIGIN}/commits?limit=${encodeURIComponent(limit)}`);

  /** Fetches the build/version report for one service.
   * @param {string} service_name Service identifier passed to the admin server.
   * @returns {Promise<Object>} Response keyed by service name.
   * @calledBy AdminCommits (reserved for the commit detail view)
   */
  static version = (service_name) =>
    request_json(
      `${ADMIN_ORIGIN}/version?service_name=${encodeURIComponent(service_name)}`,
    );
}

export default AdminBackend;
