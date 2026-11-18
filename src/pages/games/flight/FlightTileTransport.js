/** Worker-safe transport using the origin already discovered by the UI. */
export function create_flight_tile_transport(
  service_origin,
  fetch_impl = fetch,
) {
  const origin = new URL(service_origin);
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.search ||
    origin.hash ||
    origin.username ||
    origin.password
  )
    throw new TypeError("Invalid flight tile service origin");
  const base = origin.href.replace(/\/$/, "");
  const request = async (path, options) => {
    const response = await fetch_impl(`${base}/${path}`, {
      credentials: "include",
      ...options,
    });
    const body = await response.json();
    if (!response.ok) {
      const error = new Error(`Flight tiles HTTP ${response.status}`);
      error.status = response.status;
      error.code = body?.error;
      error.source_id = body?.source_id;
      throw error;
    }
    return body;
  };
  return {
    load_tile: (code, options) =>
      request(`tile?${new URLSearchParams({ short_code: code })}`, options),
    load_availability: (codes, options) =>
      request(
        `tile_availability?${new URLSearchParams({ short_codes: codes.join(",") })}`,
        options,
      ),
  };
}
