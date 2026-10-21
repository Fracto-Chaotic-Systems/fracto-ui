const superscript = (value) =>
  String(value).replace(/\d/g, (digit) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(digit)]);

/** Exact unreduced display only; angle keys and solver fractions stay unchanged. */
export function format_minibrot_angle(angle, period, relative) {
  if (!Number.isInteger(period) || period < 1 || period > 32) return angle?.key;
  const is_tip = relative === "antenna_tip";
  const multiplier = { "0/1": 1, "1/2": 2, "1/3": 3, "2/3": 3 }[relative];
  if (!is_tip && !multiplier) return angle?.key;
  try {
    const base = 1n << BigInt(period);
    const denominator = is_tip
      ? base * (base - 1n)
      : (1n << BigInt(period * multiplier)) - 1n;
    const reduced_denominator = BigInt(angle.denominator);
    if (reduced_denominator <= 0n || denominator % reduced_denominator !== 0n)
      return angle.key;
    const numerator =
      BigInt(angle.numerator) * (denominator / reduced_denominator);
    const expression = is_tip
      ? `2${superscript(period)}(2${superscript(period)}−1)`
      : `2${superscript(period * multiplier)}−1`;
    return `${numerator}/(${expression})`;
  } catch {
    return angle?.key;
  }
}
