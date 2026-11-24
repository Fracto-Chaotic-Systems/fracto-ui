import {
  component_reference_key,
  COMPONENT_MATERIAL_LIMIT,
} from "@fracto/sdk/FractoComponentTools.js";
export async function resolve_component_material(reference, signal) {
  const url = `${import.meta.env.BASE_URL}api/environment-catalog/${encodeURIComponent(reference.id)}/construction/runtime?revision=${encodeURIComponent(reference.revision)}`;
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(20000)])
      : AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error(
      response.status === 409
        ? "material_revision_changed"
        : "material_load_error",
    );
  const result = await response.json();
  if (
    result.material?.id !== reference.id ||
    result.material?.revision !== reference.revision ||
    result.runtime?.id !== reference.id ||
    !Array.isArray(result.runtime.resources)
  )
    throw new Error("material_load_error");
  return result;
}
export async function resolve_component_references(references, signal) {
  const unique = [
    ...new Map(
      references
        .filter(Boolean)
        .map((ref) => [component_reference_key(ref), ref]),
    ).values(),
  ];
  if (unique.length > COMPONENT_MATERIAL_LIMIT)
    throw new Error("construction_limit");
  const resolved = {};
  for (let i = 0; i < unique.length; i += 4)
    await Promise.all(
      unique.slice(i, i + 4).map(async (reference) => {
        resolved[component_reference_key(reference)] =
          await resolve_component_material(reference, signal);
      }),
    );
  return resolved;
}
