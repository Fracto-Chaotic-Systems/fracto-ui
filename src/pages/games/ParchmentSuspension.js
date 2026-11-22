// Coordinates share the square parchment's 0–100 frame, after its image rotation.
export const PARCHMENT_NAIL = Object.freeze({ x: 50, y: 10 });

export function parchment_string_points(angle = 0) {
  const radians = (angle * Math.PI) / 180;
  const cosine = Math.cos(radians),
    sine = Math.sin(radians);
  const rotate = (x, y) => ({
    x: 50 + (x - 50) * cosine - (y - 50) * sine,
    y: 50 + (x - 50) * sine + (y - 50) * cosine,
  });
  return [rotate(10, 17), PARCHMENT_NAIL, rotate(90, 17)];
}

export function parchment_string_path(angle = 0) {
  return parchment_string_points(angle)
    .map(({ x, y }) => `${x},${y}`)
    .join(" ");
}
