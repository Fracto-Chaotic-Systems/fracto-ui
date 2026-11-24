import { create_environment_catalog_proxy } from "./environment_catalog_proxy.js";
import { create_component_documents_proxy } from "./component_documents_proxy.js";
import { create_component_planner_proxy } from "./component_planner_proxy.js";
import { create_component_runtime_proxy } from "./component_runtime_proxy.js";

export function environment_catalog_plugin() {
  return {
    name: "fracto-environment-catalog",
    configureServer(server) {
      server.middlewares.use(
        "/api/component-runtime",
        create_component_runtime_proxy(),
      );
      server.middlewares.use(
        "/api/component-construction",
        create_component_planner_proxy(),
      );
      server.middlewares.use(
        "/api/component-documents",
        create_component_documents_proxy(),
      );
      server.middlewares.use(
        "/api/environment-catalog",
        create_environment_catalog_proxy(),
      );
    },
  };
}
