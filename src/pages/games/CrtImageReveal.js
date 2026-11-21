// Focus coordinates and starting crop width are fractions of the source image.
export function crt_image_reveal_rect(
  source_width,
  source_height,
  width,
  height,
  focus,
  time = 0,
  duration = 20,
  reduced_motion = false,
) {
  if (!(source_width > 0 && source_height > 0 && width > 0 && height > 0))
    return null;
  const fit = Math.min(width / source_width, height / source_height);
  const end = {
    x: (width - source_width * fit) / 2,
    y: (height - source_height * fit) / 2,
    width: source_width * fit,
    height: source_height * fit,
  };
  if (reduced_motion) return end;
  const scale = Math.max(
    end.width / source_width,
    width / (source_width * Math.max(0.01, focus.width)),
  );
  const start = {
    x: width / 2 - source_width * focus.x * scale,
    y: height / 2 - source_height * focus.y * scale,
    width: source_width * scale,
    height: source_height * scale,
  };
  const seconds = Math.max(4, Number(duration) || 20);
  const linear = Math.max(0, Math.min(1, (time - 1) / (seconds - 3)));
  if (linear === 1) return end;
  const progress = linear * linear * (3 - 2 * linear);
  return Object.fromEntries(
    Object.keys(end).map((key) => [
      key,
      start[key] + (end[key] - start[key]) * progress,
    ]),
  );
}
