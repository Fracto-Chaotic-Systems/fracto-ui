import { BigComplex } from "@fracto/sdk/math/BigComplex.js";

/** Keep the stored decimal precision instead of converting through Number. */
export const format_orbital_point = ({ point, landing_ratios = [] }) => {
  const coordinates = new BigComplex(point.re, point.im);
  const ratios = landing_ratios
    .map(({ numerator, denominator }) => `${numerator}/${denominator}`)
    .join(", ") || "—";
  return {
    ratios,
    real: coordinates.re.toFixed(32),
    imaginary: coordinates.im.toFixed(32),
  };
};
