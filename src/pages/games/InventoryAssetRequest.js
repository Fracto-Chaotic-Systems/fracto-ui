/** Bound the complete request, including body reads, across development restarts. */
export async function fetch_inventory_assets(
  url,
  { signal, timeout_ms = 15000, request = fetch } = {},
) {
  signal?.throwIfAborted();
  const deadline = AbortSignal.timeout(timeout_ms);
  const response = await request(url, {
    credentials: "include",
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
  });
  if (!response.ok) throw new Error("catalog_unavailable");
  const data = await response.json();
  if (!Array.isArray(data.assets)) throw new Error("catalog_unavailable");
  return data.assets;
}
