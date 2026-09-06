import ComplexQuarternary from "../utils/ComplexQuarternary.jsx";

import { FRACTO_DATA_PORT } from "../../../../constants.js";
import { service_origin } from "../utils/service_origin.jsx";

const BAILIWICK_MAX_SIZE = 4096;
const BAILIWICK_SIZE_PX = 650;
export const MAX_LEVEL = 35;

const LEVEL_SCOPES = [];

export const BIN_VERB_INDEXED = "indexed";
export const BIN_VERB_COMPLETED = "completed";
export const BIN_VERB_READY = "ready";
export const BIN_VERB_INLAND = "inland";
export const BIN_VERB_POTENTIALS = "potentials";
export const BIN_VERB_ERROR = "error";

for (let level = 0; level < MAX_LEVEL; level++) {
  LEVEL_SCOPES[level] = {};
  LEVEL_SCOPES[level]["scope"] = Math.pow(2, 1 - level);
  LEVEL_SCOPES[level][BIN_VERB_COMPLETED] = {};
  LEVEL_SCOPES[level][BIN_VERB_POTENTIALS] = {};
  LEVEL_SCOPES[level][BIN_VERB_READY] = {};
  LEVEL_SCOPES[level][BIN_VERB_INLAND] = {};
  LEVEL_SCOPES[level][BIN_VERB_INDEXED] = {};
  LEVEL_SCOPES[level][BIN_VERB_ERROR] = {};
}

export const get_ideal_level = (width_px, scope, quality_factor = 1.99) => {
  const ideal_tiles_across = Math.ceil((quality_factor * width_px) / 256);
  const ideal_tile_scope = scope / ideal_tiles_across;
  let ideal_level = -1;
  for (let i = 2; i <= MAX_LEVEL; i++) {
    if (!LEVEL_SCOPES[i]) {
      continue;
    }
    if (LEVEL_SCOPES[i].scope < ideal_tile_scope) {
      ideal_level = i;
      break;
    }
  }
  if (ideal_level < 2) {
    ideal_level = 2;
  }
  return ideal_level;
};

const CQ_code_from_point = (x, y) => {
  const CQ_str = new ComplexQuarternary(x, y).to_string();
  const cq_code = CQ_str.replace(/^0+/, "");
  if (cq_code[0] === ".") {
    return `0${cq_code}`;
  }
  return cq_code;
};

const bailiwick_name = (pattern, core_point, best_level, is_node = false) => {
  const cq_code = CQ_code_from_point(core_point.x, core_point.y);
  return `${is_node ? "N" : "B"}${pattern}-CP${cq_code.slice(0, best_level)}`;
};

const process_json_str = (json) => {
  const json_str = typeof json === "string" ? json : JSON.stringify(json);
  const clean_json_str = json_str.replaceAll('"', '\\"');
  return `${clean_json_str}`;
};

export class MinibrotBackend {
  /** Publishes a minibrot payload to the data service.
   * @param {Object} data JSON record sent with PUT /minibrot.
   * @param {Function} cb Optional completion callback.
   * @returns {void} Completion is reported through cb.
   * @calledBy save_bailiwick
   */
  static post_data = (data, cb) => {
    const origin = service_origin(FRACTO_DATA_PORT);
    const url = `${origin}/minibrot`;
    fetch(url, {
      body: JSON.stringify(data), // data you send.
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    })
      .then(function (response) {
        if (response.body) {
          return response.json();
        }
        return ["ok"];
      })
      .then(function (json_data) {
        console.log("save_bailiwick", url, data);
        if (cb) {
          cb(`published ${data.name}`);
        }
      });
  };

  /** Converts and saves a bailiwick as a minibrot record.
   * @param {Object} bailiwick Bailiwick display and geometry data.
   * @param {number} bailiwick_index Legacy index argument (not used in payload construction).
   * @param {Function} [cb=null] Optional completion callback.
   * @returns {void} Sends the request through post_data.
   * @calledBy AssetsDetector, AssetsUtils
   */
  static save_bailiwick = (bailiwick, bailiwick_index, cb = null) => {
    console.log("save_bailiwick", bailiwick);
    const highest_level = get_ideal_level(
      BAILIWICK_MAX_SIZE,
      bailiwick.display_settings.scope,
      1.5,
    );
    const name = bailiwick_name(
      bailiwick.pattern,
      bailiwick.core_point,
      highest_level,
      bailiwick.is_node,
    );
    const cq_code = CQ_code_from_point(
      bailiwick.core_point.x,
      bailiwick.core_point.y,
    );
    const core_point = process_json_str(bailiwick.core_point);
    const octave_point = process_json_str(bailiwick.octave_point);
    const display_settings = process_json_str(bailiwick.display_settings);
    const data = {
      name: `${name}`,
      CQ_code: `${cq_code.slice(0, 25)}`,
      pattern: bailiwick.pattern,
      magnitude: bailiwick.magnitude,
      best_level: highest_level,
      core_point,
      octave_point,
      display_settings,
      is_node: bailiwick.is_node ? 1 : 0,
      is_inline: bailiwick.is_inline ? 1 : 0,
    };
    if (bailiwick.id) {
      data.id = bailiwick.id;
      // data.updated_at = 'CURRENT_TIMESTAMP'
    }
    // const data_keys = Object.keys(data)
    // const encoded_params = data_keys.map(key => {
    //    return `${key}=${data[key]}`
    // })
    // const data_url = `${url}?${encoded_params.join('&')}`
    console.log("save_bailiwick data", data);
    MinibrotBackend.post_data(data, cb);
  };
}

export default MinibrotBackend;
