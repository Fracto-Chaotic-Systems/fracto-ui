import { create_environment_catalog_router } from "../../../handlers/environment_catalog.js";
import express from "express";

export function environment_catalog_plugin() {
  return {
    name: "fracto-environment-catalog",
    configureServer(server) {
      const app = express();
      app.use(create_environment_catalog_router());
      server.middlewares.use("/api/environment-catalog", app);
    },
  };
}
