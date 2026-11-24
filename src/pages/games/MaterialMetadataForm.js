import { validate_material_edit } from "@fracto/sdk/FractoMaterialMetadata.js";
export const MATERIAL_VECTOR_FIELDS = [
  "dimensions_m",
  "ground_anchor_m",
  "footprint_m",
  "texture_size_m",
];
export function material_form(material) {
  return {
    description: material.description,
    tags: material.tags.join(", "),
    ...Object.fromEntries(
      Object.entries(material.construction).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(", ") : (value ?? ""),
      ]),
    ),
  };
}
export function material_edit_from_form(form, revision) {
  const construction = {
    schema_version: 1,
    kind: form.kind,
    placement: form.placement,
    source_units: form.source_units || null,
    meters_per_unit:
      form.meters_per_unit === "" ? null : Number(form.meters_per_unit),
    up_axis: form.up_axis || null,
    forward_axis: form.forward_axis || null,
  };
  for (const key of MATERIAL_VECTOR_FIELDS) {
    const raw = form[key].trim();
    if (raw && raw.split(",").some((part) => !part.trim()))
      throw new Error("invalid_material_metadata");
    construction[key] = raw
      ? raw.split(",").map((part) => Number(part.trim()))
      : null;
  }
  return validate_material_edit({
    revision,
    description: form.description,
    tags: form.tags.trim() ? form.tags.split(",").map((tag) => tag.trim()) : [],
    construction,
  });
}
