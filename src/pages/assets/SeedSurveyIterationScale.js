// Seeded FractoFastCalc uses level 0.00625, whose current horizon is 10,000.
// Keep a bucket for each possible count, including the cap itself.
export const ITERATION_BUCKETS = 10_001;
export const ITERATION_LOW_PERCENTILE = 0.01;
export const ITERATION_HIGH_PERCENTILE = 0.99;
export const ITERATION_MIN_LIGHTNESS = 18;
export const ITERATION_MAX_LIGHTNESS = 88;

export const create_iteration_distribution = () => ({
  buckets: new Uint32Array(ITERATION_BUCKETS),
  lightness_by_iteration: new Uint8Array(ITERATION_BUCKETS),
  count: 0,
  dirty: false,
});

export const add_iteration_value = (distribution, iterations) => {
  if (!Number.isFinite(iterations) || iterations < 0) return;
  const index = Math.min(ITERATION_BUCKETS - 1, Math.trunc(iterations));
  distribution.buckets[index]++;
  distribution.count++;
  distribution.dirty = true;
};

export const update_iteration_distribution_lookup = (distribution) => {
  if (!distribution?.dirty) return;
  let below_count = 0;
  for (let index = 0; index < ITERATION_BUCKETS; index++) {
    const bucket_count = distribution.buckets[index];
    const percentile = distribution.count
      ? (below_count + bucket_count / 2) / distribution.count
      : 0.5;
    const normalized_percentile = Math.max(
      0,
      Math.min(
        1,
        (percentile - ITERATION_LOW_PERCENTILE) /
          (ITERATION_HIGH_PERCENTILE - ITERATION_LOW_PERCENTILE),
      ),
    );
    distribution.lightness_by_iteration[index] = Math.round(
      ITERATION_MAX_LIGHTNESS -
        (ITERATION_MAX_LIGHTNESS - ITERATION_MIN_LIGHTNESS) * normalized_percentile,
    );
    below_count += bucket_count;
  }
  distribution.dirty = false;
};

export const iteration_lightness_from_distribution = (
  iterations,
  distribution,
  refresh_lookup = true,
) => {
  if (!Number.isFinite(iterations) || iterations < 0 || !distribution?.count) {
    return null;
  }
  if (refresh_lookup) update_iteration_distribution_lookup(distribution);
  return distribution.lightness_by_iteration[
    Math.min(ITERATION_BUCKETS - 1, Math.trunc(iterations))
  ];
};

export const build_iteration_distribution = (iterations_list) => {
  const distribution = create_iteration_distribution();
  iterations_list.forEach((iterations) => add_iteration_value(distribution, iterations));
  update_iteration_distribution_lookup(distribution);
  return distribution;
};
