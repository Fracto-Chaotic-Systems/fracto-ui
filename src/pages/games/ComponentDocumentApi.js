import { validate_component_document } from "@fracto/sdk/FractoComponentDocument.js";
const base = () => `${import.meta.env.BASE_URL}api/component-documents`;
export async function component_request(
  path = "",
  { signal, ...options } = {},
) {
  const response = await fetch(base() + path, {
    credentials: "include",
    cache: "no-store",
    ...options,
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(response.status === 409 ? "conflict" : "request_error");
  return response.json();
}
export function validate_component_response(result) {
  if (!Number.isInteger(result.revision) || result.revision < 1)
    throw new Error("request_error");
  return {
    document: validate_component_document(result.document),
    revision: result.revision,
  };
}
