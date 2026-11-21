// A selected burst gets one texture frame near its midpoint, never a whole burst.
export function create_crt_static_flash({ random = Math.random } = {}) {
  let burst,
    selected = false,
    shown = false;
  return (state, enabled = true) => {
    if (!enabled || !state.is_static) return false;
    if (state.burst !== burst) {
      burst = state.burst;
      selected = random() < 0.35;
      shown = false;
    }
    if (!selected || shown || state.remaining > state.burst_duration / 2)
      return false;
    shown = true;
    return true;
  };
}

export function draw_crt_static_flash(ctx, { width, height }, message) {
  ctx.save();
  ctx.fillStyle = "#080a09";
  ctx.fillRect(0, 0, width, height);
  ctx.scale(width / 512, height / 384);
  ctx.font = 'bold 68px "Courier New", monospace';
  ctx.fillStyle = "#f1f3ed";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.fillText(message, 256, 184, 460);
  ctx.restore();
}
