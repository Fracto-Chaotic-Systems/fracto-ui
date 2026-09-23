/**
 * Parse a timestamp returned by MySQL.
 *
 * MySQL DATETIME values do not contain timezone information. Timezone-less
 * SQL strings are therefore interpreted as local application time, while
 * values carrying an explicit timezone retain that timezone.
 *
 * @param {unknown} timestamp value returned by the data server
 * @returns {Date|number} parsed date, or 0 for an empty value
 */
export const parse_database_timestamp = (timestamp) => {
  if (!timestamp) return 0;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp !== "string") return new Date(timestamp);

  const value = timestamp.trim();
  if (!value) return 0;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) return new Date(value);

  // Browser parsing of an ISO string without an offset uses local time.
  return new Date(value.replace(" ", "T"));
};

export default parse_database_timestamp;
