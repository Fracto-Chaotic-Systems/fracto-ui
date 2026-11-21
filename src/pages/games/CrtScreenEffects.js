export function create_crt_interference({ random = Math.random } = {}) {
  const duration = (min, max) =>
    min + Math.max(0, Math.min(1, Number(random()) || 0)) * (max - min);
  let is_static = false,
    remaining = duration(3.4, 7.8);
  return {
    reset() {
      is_static = false;
      remaining = duration(3.4, 7.8);
    },
    advance(dt, enabled = true) {
      if (!enabled) {
        if (is_static) {
          is_static = false;
          remaining = duration(3.4, 7.8);
        }
        return false;
      }
      remaining -= Math.max(0, Math.min(60, Number(dt) || 0));
      while (remaining <= 0) {
        is_static = !is_static;
        remaining += is_static ? duration(0.22, 0.68) : duration(3.4, 7.8);
      }
      return is_static;
    },
    get state() {
      return { is_static, remaining };
    },
  };
}

export function draw_crt_face(
  ctx,
  { time, pointer, reduced_motion, width, height },
) {
  ctx.save();
  ctx.scale(width / 512, height / 384);
  const gradient = ctx.createRadialGradient(256, 180, 15, 256, 180, 320);
  gradient.addColorStop(0, "#17483f");
  gradient.addColorStop(1, "#03120f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 384);
  const blink = !reduced_motion && time % 5.7 > 5.53;
  const eye_height = blink ? 5 : 48;
  ctx.shadowColor = "#80ffd0";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#a2ffda";
  for (const x of [174, 338]) {
    ctx.beginPath();
    ctx.roundRect(
      x - 21 + pointer.x * 16,
      172 - eye_height / 2 - pointer.y * 10,
      42,
      eye_height,
      12,
    );
    ctx.fill();
  }
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#8cefc8";
  ctx.beginPath();
  ctx.arc(256, 226, 35, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

export function create_crt_noise(canvas_factory) {
  const canvas = canvas_factory();
  canvas.width = 128;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  const pixels = ctx.createImageData(128, 96);
  let seed = 712367;
  return (target, { width, height, time, reduced_motion }) => {
    // Moderate luminance and no full-screen flashes. Frozen under reduced motion.
    if (reduced_motion) seed = 712367;
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      const value = 28 + ((seed >>> 24) % 100);
      pixels.data.set([value, value + 7, value + 3, 255], i);
    }
    ctx.putImageData(pixels, 0, 0);
    target.save();
    target.imageSmoothingEnabled = false;
    target.drawImage(canvas, 0, 0, width, height);
    target.fillStyle = "rgba(12,24,20,0.18)";
    const band = reduced_motion
      ? height * 0.4
      : ((time * 48) % (height + 32)) - 32;
    target.fillRect(0, band, width, 24);
    target.restore();
  };
}

export function draw_crt_glass(ctx, width, height) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);
  const reflection = ctx.createLinearGradient(0, 0, width * 0.625, height);
  reflection.addColorStop(0, "rgba(255,255,255,0.15)");
  reflection.addColorStop(0.42, "rgba(255,255,255,0)");
  ctx.fillStyle = reflection;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
