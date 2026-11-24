import path from "node:path";

import express from "express";
import { create_environment_catalog_proxy } from "./environment_catalog_proxy.js";
import { create_component_documents_proxy } from "./component_documents_proxy.js";
import { create_component_planner_proxy } from "./component_planner_proxy.js";

const FRACTO_UI_PORT = Number(process.env.FRACTO_UI_PORT || 3006);

const dist_directory = path.join(import.meta.dirname, "..", "dist");
const index_file = path.join(dist_directory, "index.html");
const app = express();
app.use("/api/component-construction", create_component_planner_proxy());
app.use("/api/environment-catalog", create_environment_catalog_proxy());
app.use("/api/component-documents", create_component_documents_proxy());

app.use(express.static(dist_directory, { index: false }));
app.get("/", (request, response) => response.sendFile(index_file));
app.use((request, response) => response.sendFile(index_file));

app.listen(FRACTO_UI_PORT, "0.0.0.0", () => {
  console.log(`Fracto UI is running on http://localhost:${FRACTO_UI_PORT}`);
});
