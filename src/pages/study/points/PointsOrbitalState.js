/** Missing lifecycle fields retain compatibility with previously stored rows. */
export const orbital_selectable = (orbital) =>
  Boolean(orbital) &&
  orbital.selectable !== false &&
  (!orbital.lifecycle_state || orbital.lifecycle_state.orbital === "validated");

export const orbital_ratio_label = (orbital) => {
  if (!orbital_selectable(orbital)) return "orbital_pending";
  const status = orbital.lifecycle_state?.assignments;
  if (status === "not_applicable" || orbital.ray_status === "attracting")
    return "ratios_not_applicable";
  return ["unresolved", "partial", "verified"].includes(status) ||
    [
      "unresolved",
      "no_rays",
      "closure_failed",
      "branch_changed",
      "period_limit",
      "family_limit",
    ].includes(orbital.ray_status)
    ? "ratios_unresolved"
    : "ratios_pending";
};
