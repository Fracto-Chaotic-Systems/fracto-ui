/** Derive ISO timestamps without inventing a start time for missing health data. */
export const server_times = (health, checked_at) => {
  const checked_ms = checked_at instanceof Date ? checked_at.getTime() : NaN;
  const uptime = health?.uptime_seconds;
  const valid_uptime =
    uptime !== null &&
    uptime !== undefined &&
    Number.isFinite(Number(uptime)) &&
    Number(uptime) >= 0;
  const started =
    valid_uptime && Number.isFinite(checked_ms)
      ? new Date(checked_ms - Number(uptime) * 1000)
      : null;
  return {
    checked_at: Number.isFinite(checked_ms) ? checked_at.toISOString() : null,
    started_at:
      started && Number.isFinite(started.getTime())
        ? started.toISOString()
        : null,
  };
};

/** Use the largest applicable duration unit, with at most one decimal place. */
export const format_server_uptime = (value, locale) => {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && !value.trim())
  )
    return null;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  const [unit, scale] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ].find(([, scale]) => seconds >= scale) || ["second", 1];
  // Avoid rounding 59.99 minutes up to 60 while still displaying minute units.
  const amount = Math.floor((seconds / scale) * 10) / 10;
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit,
    unitDisplay: "long",
    maximumFractionDigits: 1,
  }).format(amount);
};
