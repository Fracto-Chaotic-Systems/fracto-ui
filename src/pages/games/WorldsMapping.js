export const WORLD_DRAG_TYPE = "application/x-fracto-world-synset";
export const WORLDS_PAGE_SIZE = 64;

export function prime_factorization(value) {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error("Expected a positive safe integer");
  const factors = [];
  let remainder = value;
  for (
    let prime = 2;
    prime <= remainder / prime;
    prime += prime === 2 ? 1 : 2
  ) {
    let exponent = 0;
    while (remainder % prime === 0) {
      remainder /= prime;
      exponent++;
    }
    if (exponent) factors.push({ prime, exponent });
  }
  if (remainder > 1) factors.push({ prime: remainder, exponent: 1 });
  return factors;
}

export function normalize_world_mapping(value, contenders) {
  const allowed = new Set(contenders.map((item) => item.id));
  const seen = new Set();
  return Object.fromEntries(
    Object.entries(
      value && typeof value === "object" && !Array.isArray(value) ? value : {},
    ).filter(([row, id]) => {
      const valid =
        /^[1-9]\d*$/.test(row) &&
        Number.isSafeInteger(Number(row)) &&
        allowed.has(id) &&
        !seen.has(id);
      if (valid) seen.add(id);
      return valid;
    }),
  );
}

// Moving onto an occupied row swaps its association back into the source row.
// A contender from the tray replaces the target; the displaced card stays available.
export function place_world(mapping, target, id, contenders) {
  const next = normalize_world_mapping(mapping, contenders);
  if (
    !Number.isSafeInteger(target) ||
    target < 1 ||
    !contenders.some((item) => item.id === id)
  )
    return next;
  const source = Object.keys(next).find((row) => next[row] === id);
  if (source === String(target)) return next;
  const displaced = next[target];
  if (source) {
    delete next[source];
    if (displaced) next[source] = displaced;
  }
  next[target] = id;
  return next;
}

export function remove_world(mapping, id) {
  return Object.fromEntries(
    Object.entries(mapping).filter(([, assigned]) => assigned !== id),
  );
}
