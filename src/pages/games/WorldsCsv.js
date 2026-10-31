import { prime_factorization } from "./WorldsMapping.js";

// Quote every field so commas, quotes and multiline notes round-trip correctly.
const csv_field = (value) => `"${String(value).replaceAll('"', '""')}"`;
export function worlds_csv(associations, notes) {
  const rows = [
    ["cardinality", "factorization", "wordnet association", "name", "notes"],
  ];
  for (const cardinality of Object.keys(associations)
    .map(Number)
    .sort((a, b) => a - b)) {
    const sense = associations[cardinality];
    const factorization =
      prime_factorization(cardinality)
        .map(
          ({ prime, exponent }) =>
            `${prime}${exponent > 1 ? `^${exponent}` : ""}`,
        )
        .join(" x ") || "1";
    rows.push([
      cardinality,
      factorization,
      `${sense.label}: ${sense.definition}`,
      sense.world_name,
      notes[cardinality] ?? "",
    ]);
  }
  // BOM supports Unicode when opening the download in desktop spreadsheet apps.
  return (
    "\uFEFF" +
    rows.map((row) => row.map(csv_field).join(",")).join("\r\n") +
    "\r\n"
  );
}
