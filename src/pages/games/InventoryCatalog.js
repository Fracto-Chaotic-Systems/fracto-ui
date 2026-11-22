// Read legacy browser drafts for migration; live saves use the catalog endpoint.
export const ATTRIBUTION_FIELDS = [
  "creator_name",
  "creator_profile_url",
  "source_url",
  "license_name",
  "license_file",
  "credit_text",
  "modification_conditions",
  "redistribution_conditions",
  "notes",
];
export const CATALOG_DRAFT_PREFIX = "fracto/inventory-catalog/v1/";

export function safe_catalog_url(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function parse_catalog_record(raw, expected_id) {
  const record = JSON.parse(raw);
  if (
    !record ||
    record.id !== expected_id ||
    record.schema_version !== 1 ||
    !record.attribution ||
    typeof record.attribution !== "object" ||
    Array.isArray(record.attribution) ||
    !Array.isArray(record.history) ||
    !Array.isArray(record.sources) ||
    typeof record.name !== "string" ||
    typeof record.version !== "string" ||
    typeof record.description !== "string"
  ) {
    throw new Error("invalid_record");
  }
  for (const field of ATTRIBUTION_FIELDS) {
    const value = record.attribution[field];
    if (value != null && (typeof value !== "string" || value.length > 10000)) {
      throw new Error("invalid_record");
    }
  }
  if (
    record.history.some(
      (item) =>
        !item ||
        typeof item.date !== "string" ||
        typeof item.action !== "string" ||
        typeof item.description !== "string",
    ) ||
    record.sources.some(
      (item) =>
        !item ||
        typeof item.path !== "string" ||
        typeof item.format !== "string",
    )
  )
    throw new Error("invalid_record");
  return record;
}

export function update_catalog_record(
  record,
  fields,
  note = "",
  date = new Date(),
) {
  if (note.length > 10000) throw new Error("invalid_record");
  const attribution = { ...record.attribution };
  for (const field of ATTRIBUTION_FIELDS) {
    const value = (fields[field] || "").trim();
    if (value.length > 10000) throw new Error("invalid_record");
    if (
      value &&
      ["creator_profile_url", "source_url"].includes(field) &&
      !safe_catalog_url(value)
    )
      throw new Error("invalid_url");
    attribution[field] = value || null;
  }
  const changed = ATTRIBUTION_FIELDS.some(
    (field) => (record.attribution[field] || null) !== attribution[field],
  );
  // Having basic attribution recorded is not a verification of license terms.
  if (changed)
    attribution.status = [
      "creator_name",
      "source_url",
      "license_name",
      "credit_text",
    ].every((field) => attribution[field])
      ? "recorded-unverified"
      : "unresolved";
  const day = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  const history = [...record.history];
  if (changed)
    history.push({
      date: day,
      action: "update-attribution",
      description: "Updated catalog attribution details.",
    });
  if (note.trim())
    history.push({
      date: day,
      action: "catalog-note",
      description: note.trim(),
    });
  return { ...record, attribution, history };
}

export function read_catalog_draft(seed, storage) {
  const raw = storage.getItem(CATALOG_DRAFT_PREFIX + seed.id);
  return raw ? parse_catalog_record(raw, seed.id) : seed;
}

export function save_catalog_draft(record, storage) {
  storage.setItem(CATALOG_DRAFT_PREFIX + record.id, JSON.stringify(record));
}

// Compare with the last file read before writing so concurrent changes are kept.
export async function write_catalog_file(handle, previous_raw, record) {
  const current_raw = await (await handle.getFile()).text();
  if (current_raw !== previous_raw) throw new Error("file_conflict");
  const raw = JSON.stringify(record, null, 2) + "\n";
  const writable = await handle.createWritable();
  try {
    await writable.write(raw);
    await writable.close();
  } catch (error) {
    await writable.abort().catch(() => {});
    throw error;
  }
  return raw;
}
