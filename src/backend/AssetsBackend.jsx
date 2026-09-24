import { FETCH_JSON_HEADERS } from "../pages/study/StudyUtils.jsx";
import { service_origin } from "../utils/service_origin.jsx";
import { request_json } from "./BackendUtils.jsx";

const ASSETS_ORIGIN = () => service_origin("asset");
const DATA_ORIGIN = () => service_origin("data");

export class AssetsBackend {
  /** Creates a new video project through the asset service.
   * @returns {Promise<Object>} The created video record, including its id.
   * @calledBy AssetsVideoGenerator
   */
  static new_video = () =>
    request_json(`${ASSETS_ORIGIN()}/new_video`, {
      method: "POST",
      headers: FETCH_JSON_HEADERS,
    });

  /** Updates an existing video project through the asset service.
   * @param {Object} video Complete video record, including its numeric id.
   * @returns {Promise<Object>} Data-server update response.
   * @calledBy AssetsVideoGenerator
   */
  static update_video = (video) => {
    if (!video?.id) {
      return Promise.reject(new Error("A video id is required to update a video"));
    }
    return request_json(`${ASSETS_ORIGIN()}/video/${video.id}`, {
      method: "PUT",
      headers: FETCH_JSON_HEADERS,
      body: JSON.stringify(video),
    });
  };

  /** Reads the persisted frame/video render lifecycle for a video.
   * @param {number|string} video_id Video identifier.
   * @returns {Promise<Object>} Render state and progress.
   * @calledBy VideoMetaRender
   */
  static render_status = (video_id) =>
    request_json(`${ASSETS_ORIGIN()}/video/${video_id}/render`);

  /** Returns the browser URL for a completed video output.
   * @param {number|string} video_id Video identifier.
   * @returns {string} Asset-server output URL.
   * @calledBy VideoMetaRender
   */
  static video_render_output_url = (video_id) =>
    `${ASSETS_ORIGIN()}/video/${video_id}/render/output`;

  /** Starts frame production followed by server-side video assembly.
   * @param {number|string} video_id Video identifier.
   * @returns {Promise<Object>} Accepted render state.
   * @calledBy VideoMetaRender
   */
  static start_video_render = (video_id) =>
    request_json(`${ASSETS_ORIGIN()}/video/${video_id}/render`, {
      method: "POST",
      headers: FETCH_JSON_HEADERS,
    });

  /** Requests cancellation of frame production or ffmpeg assembly.
   * @param {number|string} video_id Video identifier.
   * @returns {Promise<Object>} Updated cancellation state.
   * @calledBy VideoMetaRender
   */
  static cancel_video_render = (video_id) =>
    request_json(`${ASSETS_ORIGIN()}/video/${video_id}/render/cancel`, {
      method: "POST",
      headers: FETCH_JSON_HEADERS,
    });

  /** Retries a failed or cancelled video render.
   * @param {number|string} video_id Video identifier.
   * @returns {Promise<Object>} Accepted retry state.
   * @calledBy VideoMetaRender
   */
  static retry_video_render = (video_id) =>
    request_json(`${ASSETS_ORIGIN()}/video/${video_id}/render/retry`, {
      method: "POST",
      headers: FETCH_JSON_HEADERS,
    });

  /** Re-assembles an existing numbered frame workspace after a restart.
   * @param {number|string} video_id Video identifier.
   * @returns {Promise<Object>} Accepted assembly state.
   * @calledBy VideoMetaRender
   */
  static assemble_video_render = (video_id) =>
    request_json(`${ASSETS_ORIGIN()}/video/${video_id}/render/assemble`, {
      method: "POST",
      headers: FETCH_JSON_HEADERS,
    });

  /** Loads the UI style-property catalog used by the lore editor.
   * @returns {Promise<Object>} The JSON property definitions.
   * @calledBy ContentStyleGrid
   */
  static load_style_properties = () => request_json("/css/properties.json");

  /** Renders an asset image through the asset service.
   * @param {Object} frame_settings Focal point and scope settings.
   * @param {number} resolution Requested pixel resolution.
   * @returns {Promise<Object|Error>} Render response, or an error value on failure.
   * @calledBy AssetsImageGenerator
   */
  static render_image = async (frame_settings, resolution) => {
    const all_params = [
      `width_px=${resolution}`,
      `focal_point_x=${frame_settings.focal_point.x}`,
      `focal_point_y=${frame_settings.focal_point.y}`,
      `scope=${frame_settings.scope}`,
      `resolution_factor=${2.0}`,
      `aspect_ratio=${1}`,
    ].join("&");
    const url = `${ASSETS_ORIGIN()}/render_image?${all_params}`;
    try {
      const image_outcome = await fetch(url, {}).then((res) => res.json());
      console.log("image_outcome", image_outcome);
      return image_outcome;
    } catch (error) {
      console.error(`error fetching ${url}`, error.message);
      return error;
    }
  };

  /** Adds a rendered image record to the data service gallery.
   * @param {Object} image_outcome Render result containing asset metadata.
   * @returns {Promise<Object|Error>} Insert response, or an error value on failure.
   * @calledBy AssetsImageGenerator
   */
  static add_to_gallery = async (image_outcome) => {
    const all_params = [
      `asset_id=${image_outcome.asset_id.replace("img_", "")}`,
      `width=${image_outcome.width_px}`,
      `height=${image_outcome.width_px}`,
      `focal_point_x=${image_outcome.focal_point.x}`,
      `focal_point_y=${image_outcome.focal_point.y}`,
      `scope=${image_outcome.scope}`,
      `filename=${image_outcome.filename}`,
      `public_url=${image_outcome.public_url}`,
      `asset_type=image`,
    ].join("&");
    const url = `${DATA_ORIGIN()}/asset?${all_params}`;
    try {
      const insert_outcome = await fetch(url, {}).then((res) => res.json());
      console.log("insert_outcome", insert_outcome);
      return insert_outcome;
    } catch (error) {
      console.error(`error fetching ${url}`, error.message);
      return error;
    }
  };

  /** Lists asset records from the data service.
   * @returns {Promise<Object[]>} Asset result rows; returns [] on failure.
   * @calledBy GalleryList
   */
  static load_assets = async () => {
    const url = `${DATA_ORIGIN()}/assets`;
    try {
      const fetched = await fetch(url, FETCH_JSON_HEADERS).then((res) => {
        return res.json();
      });
      return fetched.result;
    } catch (error) {
      console.error(`error fetching ${url}`, error.message);
      return [];
    }
  };

  /** Loads the 4800px image assets used by the welcome page. */
  static load_welcome_images = async () => {
    const params = new URLSearchParams({
      asset_type: "image",
      width: "4800",
      height: "4800",
    });
    const url = `${DATA_ORIGIN()}/assets?${params}`;
    try {
      const fetched = await fetch(url, FETCH_JSON_HEADERS).then((res) =>
        res.json(),
      );
      return (fetched.result || [])
        .filter(
          (asset) =>
            asset?.asset_id &&
            /^https?:\/\//i.test(asset.public_url || "") &&
            Number(asset.width) === 4800 &&
            Number(asset.height) === 4800 &&
            asset.asset_type === "image",
        )
        .map(({ asset_id, public_url, width, height }) => ({
          asset_id,
          public_url,
          width: Number(width),
          height: Number(height),
        }));
    } catch (error) {
      console.error(`error fetching ${url}`, error.message);
      return [];
    }
  };

  /** Lists lore categories from the data service.
   * @returns {Promise<Object[]|Error>} Category rows or an error value.
   * @calledBy LoreUtils
   */
  static lore_categories = async () => {
    const url = `${DATA_ORIGIN()}/lore_categories`;
    try {
      const fetched = await fetch(url, FETCH_JSON_HEADERS).then((res) => {
        return res.json();
      });
      return fetched.result;
    } catch (error) {
      console.error(`error fetching ${url}`, error.message);
      return error;
    }
  };

  /** Loads one lore-content record.
   * @param {number|string} content_id Content identifier.
   * @returns {Promise<Object|Error>} The first result row or an error value.
   * @calledBy lore content renderer components
   */
  static get_lore_content = async (content_id) => {
    const url = `${DATA_ORIGIN()}/lore_content?id=${content_id}`;
    try {
      const fetched = await fetch(url, FETCH_JSON_HEADERS);
      const json = await fetched.json();
      return json.result[0];
    } catch (error) {
      console.error(`get_lore_content error fetching ${url}`, error.message);
      return error;
    }
  };
}

export default AssetsBackend;
