import { create_http_proxy } from "@fracto/sdk/utils/HttpProxy.js";
import process from "node:process";
export const create_component_documents_proxy = () =>
  create_http_proxy({
    origin: () =>
      `http://127.0.0.1:${Number(process.env.FRACTO_DATA_PORT || 3002)}`,
    prefix: "/component-documents",
    timeout_ms: 15000,
    error: "component_unavailable",
  });
