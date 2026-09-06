const GOLDEN_RATIO = 1.618;

/**
 * Clears a canvas and renders a neutral delayed-operation message.
 *
 * @param {CanvasRenderingContext2D} ctx Canvas context to update.
 * @param {number} width_px Canvas width in pixels.
 * @param {number} height_px Canvas height in pixels.
 * @param {string} message Message to display while work is pending.
 * @returns {void}
 */
export const draw_loading_canvas = (ctx, width_px, height_px, message) => {
  ctx.fillStyle = "#888888";
  ctx.fillRect(0, 0, width_px, height_px);
  ctx.fillStyle = "white";
  ctx.font = "bold italic 16px sans-serif";
  ctx.letterSpacing = "3px";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(message, width_px / 2, height_px - height_px / GOLDEN_RATIO);
};
