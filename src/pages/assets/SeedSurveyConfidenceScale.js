export const CONFIDENCE_DISTRIBUTION_BUCKETS = 4096;
export const CONFIDENCE_LOW_PERCENTILE = 0.01;
export const CONFIDENCE_HIGH_PERCENTILE = 0.99;
export const CONFIDENCE_MIN_LIGHTNESS = 18;
export const CONFIDENCE_MAX_LIGHTNESS = 88;

export const create_confidence_distribution = () => ({
  buckets: new Uint32Array(CONFIDENCE_DISTRIBUTION_BUCKETS),
  lightness_by_bucket: new Uint8Array(CONFIDENCE_DISTRIBUTION_BUCKETS),
  count: 0,
  dirty: false,
});

export const add_confidence_to_distribution = (distribution, confidence) => {
  if (!Number.isFinite(confidence) || confidence < 0) return;
  const clamped_confidence = Math.max(0, Math.min(1, confidence));
  const bucket_index = Math.min(
    CONFIDENCE_DISTRIBUTION_BUCKETS - 1,
    Math.floor(clamped_confidence * CONFIDENCE_DISTRIBUTION_BUCKETS),
  );
  distribution.buckets[bucket_index]++;
  distribution.count++;
  distribution.dirty = true;
};

export const build_confidence_distribution = (confidences) => {
  const distribution = create_confidence_distribution();
  confidences.forEach((confidence) =>
    add_confidence_to_distribution(distribution, confidence));
  update_confidence_distribution_lookup(distribution);
  return distribution;
};

export const update_confidence_distribution_lookup = (distribution) => {
  if (!distribution?.dirty) return;
  let below_count = 0;
  for (let index = 0; index < CONFIDENCE_DISTRIBUTION_BUCKETS; index++) {
    const bucket_count = distribution.buckets[index];
    const percentile = distribution.count
      ? (below_count + bucket_count / 2) / distribution.count
      : 0.5;
    const normalized_percentile = Math.max(
      0,
      Math.min(
        1,
        (percentile - CONFIDENCE_LOW_PERCENTILE) /
          (CONFIDENCE_HIGH_PERCENTILE - CONFIDENCE_LOW_PERCENTILE),
      ),
    );
    distribution.lightness_by_bucket[index] = Math.round(
      CONFIDENCE_MIN_LIGHTNESS +
        (CONFIDENCE_MAX_LIGHTNESS - CONFIDENCE_MIN_LIGHTNESS) *
          normalized_percentile,
    );
    below_count += bucket_count;
  }
  distribution.dirty = false;
};

/** Map a confidence's empirical percentile to the fixed 18–88% lightness span. */
export const confidence_lightness_from_distribution = (confidence, distribution) => {
  if (!Number.isFinite(confidence) || confidence < 0 || !distribution?.count) {
    return null;
  }
  update_confidence_distribution_lookup(distribution);
  const clamped_confidence = Math.max(0, Math.min(1, confidence));
  const bucket_index = Math.min(
    CONFIDENCE_DISTRIBUTION_BUCKETS - 1,
    Math.floor(clamped_confidence * CONFIDENCE_DISTRIBUTION_BUCKETS),
  );
  return distribution.lightness_by_bucket[bucket_index];
};
