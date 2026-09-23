import { copy_json } from "../Dom.jsx";
import AppSettings from "../../AppSettings.jsx";
import {
  KEY_NAVIGATOR_DISABLED,
  KEY_NAVIGATOR_STRATEGY,
} from "../../settings/NavigatorSettings.jsx";
import TilesBackend from "../../backend/TilesBackend.jsx";
import FractoCanvasBuffer from "../../../../../sdk/FractoCanvasBuffer.js";

let render_request_sequence = 0;

/**
 * UI adapter for requesting and displaying a canvas buffer.
 *
 * This is deliberately the only layer that combines the SDK renderer with
 * application settings and the tiles-server backend.
 */
export class FractoCanvasClient {
  /**
   * Fetches a canvas buffer and paints it into a supplied 2D context.
   *
   * Application settings and backend access intentionally live in this
   * adapter; FractoCanvasBuffer contains only the rendering algorithm.
   *
   * @param {CanvasRenderingContext2D} ctx target canvas context
   * @param {number} width_px requested raster width
   * @param {{x:number,y:number}} focal_point complex-plane focal point
   * @param {number} scope visible complex-plane scope
   * @param {number} aspect_ratio raster height-to-width ratio
   * @param {Function} on_plan_complete completion callback
   * @param {number} resolution_factor server resolution multiplier
   * @param {string} data_endpoint tiles endpoint name
   * @returns {Promise<void>}
   */
  static fill_canvas = async (
    ctx,
    width_px,
    focal_point,
    scope,
    aspect_ratio,
    on_plan_complete,
    resolution_factor,
    data_endpoint = "canvas_buffer",
  ) => {
    const request_id = ++render_request_sequence;
    AppSettings.on_settings_changed({
      [KEY_NAVIGATOR_DISABLED]: true,
    });
    const all_params = [
      `width_px=${width_px}`,
      `focal_point_x=${focal_point.x}`,
      `focal_point_y=${focal_point.y}`,
      `scope=${scope}`,
      `aspect_ratio=${aspect_ratio}`,
      `resolution_factor=${resolution_factor}`,
      `strategy=${AppSettings.get(KEY_NAVIGATOR_STRATEGY) || "turbo"}`,
    ].join("&");
    try {
      const result = await TilesBackend.canvas_buffer(
        data_endpoint,
        Object.fromEntries(new URLSearchParams(all_params)),
      );
      FractoCanvasBuffer.buffer_to_canvas(result.canvas_buffer, ctx);
      if (on_plan_complete) {
        on_plan_complete(result.canvas_buffer, ctx, {
          request_id,
          width_px,
          focal_point: copy_json(focal_point),
          scope,
        });
      }
    } catch (error) {
      console.error(
        "exception thrown in fill_canvas",
        { data_endpoint, params: all_params },
        error,
      );
    } finally {
      AppSettings.on_settings_changed({
        [KEY_NAVIGATOR_DISABLED]: false,
      });
    }
  };
}

export default FractoCanvasClient;
