import { service_origin } from "../utils/service_origin.jsx";
import { request_json } from "./BackendUtils.jsx";

export class AdminBackend {
  /** Fetches recent commits from all allowlisted Fracto repositories.
   * @param {number} limit Maximum number of aggregate commits to return.
   * @returns {Promise<{commits: Array, tag_events: Array, tag_records: Array}>}
   *   Date-descending commit summaries plus normalized tag events and their
   *   raw repository-level records.
   * @calledBy AdminCommits componentDidMount.
   */
  static commits = (limit = 100) =>
    request_json(`${service_origin("admin")}/commits?limit=${encodeURIComponent(limit)}`);

  /** Fetches the build/version report for one service.
   * @param {string} service_name Service identifier passed to the admin server.
   * @returns {Promise<Object>} Response keyed by service name.
   * @calledBy AdminCommits (reserved for the commit detail view)
   */
  static version = (service_name) =>
    request_json(
      `${service_origin("admin")}/version?service_name=${encodeURIComponent(service_name)}`,
    );

  /** Fetches the allowlisted social communication documents.
   * @returns {Promise<{documents: Array}>} Root social Markdown documents.
   * @calledBy AdminSocial componentDidMount.
   */
  static social = () => request_json(`${service_origin("admin")}/social`);
}

export default AdminBackend;
