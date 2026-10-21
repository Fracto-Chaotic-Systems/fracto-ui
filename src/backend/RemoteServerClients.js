/** Discover client snapshots without sending credentials to remote addresses. */
export const create_remote_clients_reader = (request) => {
  const endpoints = new Map();
  return async (server_url) => {
    const base = server_url.replace(/\/+$/, "");
    let failure;
    for (const url of [
      ...new Set(
        [
          endpoints.get(base),
          `${base}/clients`,
          `${base}/api/main/clients`,
        ].filter(Boolean),
      ),
    ]) {
      try {
        const result = await request(url, {
          credentials: "omit",
          signal: AbortSignal.timeout(4000),
        });
        if (result?.contract_version !== 1 || !Array.isArray(result.clients))
          throw new Error("Client information is unavailable on this server");
        endpoints.set(base, url);
        return result;
      } catch (error) {
        failure = error;
      }
    }
    throw failure;
  };
};
