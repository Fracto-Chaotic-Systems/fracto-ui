import { create_environment_catalog_proxy } from "./environment_catalog_proxy.js";

export function environment_catalog_plugin() {
  return {
    name: "fracto-environment-catalog",
    configureServer(server) {
      server.middlewares.use(
        "/api/environment-catalog",
        create_environment_catalog_proxy(),
      );
    },
  };
}
