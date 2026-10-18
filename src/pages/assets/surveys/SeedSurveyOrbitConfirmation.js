/** Cyclic complex product of consecutive orbital-point sums. */
export const orbital_confirmation = (points, magnitude) => {
  if (!(magnitude > 0.25) || !points.length) return null;
  let re = 1;
  let im = 0;
  for (let index = 0; index < points.length; index++) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) return null;
    const sum_re = a.x + b.x;
    const sum_im = a.y + b.y;
    const next_re = re * sum_re - im * sum_im;
    im = re * sum_im + im * sum_re;
    re = next_re;
    if (!Number.isFinite(re) || !Number.isFinite(im)) return null;
  }
  const length = Math.hypot(re, im);
  const length_error = Math.abs(length - 1);
  return { re, im, length, length_error, confidence: Math.max(0, 1 - length_error) };
};
