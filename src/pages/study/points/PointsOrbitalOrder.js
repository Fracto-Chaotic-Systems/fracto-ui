/** Choose a cycle origin without sorting points or changing stored point IDs. */
export const orbital_start_index = (orbital) => {
  let start = 0;
  let minimum = null;
  (orbital?.points || []).forEach((point, index) => {
    for (const ratio of point.landing_ratios || []) {
      const text = String(ratio.numerator);
      if (!/^\d+$/.test(text)) continue;
      const numerator = BigInt(text);
      if (minimum === null || numerator < minimum) {
        minimum = numerator;
        start = index;
      }
    }
  });
  return start;
};

export const ordered_orbital_points = (orbital) => {
  const points = orbital?.points || [];
  const start = orbital_start_index(orbital);
  return start ? points.slice(start).concat(points.slice(0, start)) : points;
};

const lowest_numerator = (orbital) => {
  const point = orbital?.points?.[orbital_start_index(orbital)];
  let minimum = null;
  for (const ratio of point?.landing_ratios || []) {
    if (!/^\d+$/.test(String(ratio.numerator))) continue;
    const numerator = BigInt(ratio.numerator);
    if (minimum === null || numerator < minimum) minimum = numerator;
  }
  return minimum;
};

/** Keep ties stable; ratio-free orbitals follow known numerators of the same period. */
export const compare_orbitals = (a, b) => {
  const period = Number(a.period) - Number(b.period);
  if (period) return period;
  const left = lowest_numerator(a);
  const right = lowest_numerator(b);
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left < right ? -1 : 1;
};

/** Compare exact fractions without rounding large numerators or mutating stored groups. */
export const format_landing_ratios = (ratios = []) =>
  [...ratios]
    .sort((a, b) => {
      const left = BigInt(a.numerator) * BigInt(b.denominator);
      const right = BigInt(b.numerator) * BigInt(a.denominator);
      return left === right ? 0 : left < right ? -1 : 1;
    })
    .map(({ numerator, denominator }) => `${numerator}/${denominator}`)
    .join(", ") || "—";
