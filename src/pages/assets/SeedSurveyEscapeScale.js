export const ESCAPE_ITERATION_BUCKETS = 4097;
export const ESCAPE_LOW_PERCENTILE = 0.01;
export const ESCAPE_HIGH_PERCENTILE = 0.99;
export const ESCAPE_MIN_LIGHTNESS = 18;
export const ESCAPE_MAX_LIGHTNESS = 88;

export const create_escape_distribution = () => ({
  buckets: new Uint32Array(ESCAPE_ITERATION_BUCKETS),
  lightness_by_iteration: new Uint8Array(ESCAPE_ITERATION_BUCKETS),
  count: 0,
  dirty: false,
});

export const add_escape_iteration = (distribution, iterations) => {
  if (!Number.isFinite(iterations) || iterations < 0) return;
  const index = Math.min(
    ESCAPE_ITERATION_BUCKETS - 1,
    Math.trunc(iterations),
  );
  distribution.buckets[index]++;
  distribution.count++;
  distribution.dirty = true;
};

export const update_escape_distribution_lookup = (distribution) => {
  if (!distribution?.dirty) return;
  let below_count = 0;
  for (let index = 0; index < ESCAPE_ITERATION_BUCKETS; index++) {
    const bucket_count = distribution.buckets[index];
    const percentile = distribution.count
      ? (below_count + bucket_count / 2) / distribution.count
      : 0.5;
    const normalized_percentile = Math.max(
      0,
      Math.min(
        1,
        (percentile - ESCAPE_LOW_PERCENTILE) /
          (ESCAPE_HIGH_PERCENTILE - ESCAPE_LOW_PERCENTILE),
      ),
    );
    distribution.lightness_by_iteration[index] = Math.round(
      ESCAPE_MAX_LIGHTNESS -
        (ESCAPE_MAX_LIGHTNESS - ESCAPE_MIN_LIGHTNESS) * normalized_percentile,
    );
    below_count += bucket_count;
  }
  distribution.dirty = false;
};

export const escape_lightness_from_distribution = (iterations, distribution) => {
  if (!Number.isFinite(iterations) || iterations < 0 || !distribution?.count) {
    return null;
  }
  update_escape_distribution_lookup(distribution);
  const index = Math.min(
    ESCAPE_ITERATION_BUCKETS - 1,
    Math.trunc(iterations),
  );
  return distribution.lightness_by_iteration[index];
};

export const build_escape_distribution = (iterations_list) => {
  const distribution = create_escape_distribution();
  iterations_list.forEach((iterations) => add_escape_iteration(distribution, iterations));
  update_escape_distribution_lookup(distribution);
  return distribution;
};
