/** Discovers direct-main and nginx-fronted public health routes. */
export const create_remote_health_reader = (request) => {
  const resolved_endpoints = new Map();
  return async (server_url) => {
    const base = server_url.replace(/\/+$/, "");
    const direct = `${base}/healthz`;
    const proxied = `${base}/api/main/healthz`;
    const endpoints = [
      ...new Set(
        [resolved_endpoints.get(base), direct, proxied].filter(Boolean),
      ),
    ];
    let failure;
    for (const endpoint of endpoints) {
      try {
        const health = await request(endpoint, {
          credentials: "omit",
          signal: AbortSignal.timeout(4000),
        });
        if (
          health?.contract_version !== 1 ||
          !health.services ||
          typeof health.services !== "object" ||
          Array.isArray(health.services)
        )
          throw new Error("Unsupported server health contract");
        resolved_endpoints.set(base, endpoint);
        return health;
      } catch (error) {
        failure = error;
      }
    }
    resolved_endpoints.delete(base);
    throw failure;
  };
};
