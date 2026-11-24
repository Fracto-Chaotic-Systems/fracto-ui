import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import {
  validate_component_runtime,
  component_runtime_json,
} from "@fracto/sdk/FractoComponentRuntime.js";
import { component_reference_key } from "@fracto/sdk/FractoComponentTools.js";
import { uses_same_origin_proxy_for_port } from "../service_ports_mode.js";

export function component_runtime_manifest_url(
  key,
  release,
  location = window.location,
  base = import.meta.env.BASE_URL,
) {
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key) ||
    !/^[a-f0-9]{64}$/.test(release)
  )
    throw new Error("invalid_runtime_release");
  const prefix = uses_same_origin_proxy_for_port(location.port)
    ? "/api/asset/component-runtime/"
    : `${base}api/component-runtime/`;
  return new URL(`${prefix}${key}/${release}/manifest.json`, location.origin)
    .href;
}

export async function load_component_runtime(url, signal, request = fetch) {
  const response = await request(url, {
    cache: "force-cache",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
      : AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("runtime_release_unavailable");
  const manifest = validate_component_runtime(await response.json());
  const release = new URL(".", url).pathname.split("/").filter(Boolean).at(-1);
  // The bundled hash works on HTTP lab origins without Web Crypto.
  if (
    bytesToHex(
      sha256(new TextEncoder().encode(component_runtime_json(manifest))),
    ) !== release
  )
    throw new Error("runtime_manifest_hash_mismatch");
  const descriptors = {};
  for (const descriptor of manifest.materials) {
    const runtime = { ...descriptor.runtime, file_urls: {} };
    for (const resource of runtime.resources)
      runtime.file_urls[resource] = new URL(
        descriptor.file_paths[resource],
        url,
      ).href;
    descriptors[component_reference_key(descriptor.material)] = {
      material: descriptor.material,
      runtime,
    };
  }
  return {
    document: manifest.component,
    release,
    resolve_materials: async (references) => {
      const result = {};
      for (const reference of references.filter(Boolean)) {
        const key = component_reference_key(reference);
        if (!Object.hasOwn(descriptors, key))
          throw new Error("runtime_material_missing");
        result[key] = descriptors[key];
      }
      return result;
    },
  };
}
