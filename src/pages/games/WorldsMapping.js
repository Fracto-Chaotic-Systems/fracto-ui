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
