import { create_http_proxy } from "@fracto/sdk/utils/HttpProxy.js";
import process from "node:process";
export const create_component_runtime_proxy = () =>
  create_http_proxy({
    origin: () =>
      `http://127.0.0.1:${Number(process.env.FRACTO_ASSET_PORT || 3003)}`,
    prefix: "/component-runtime",
    timeout_ms: 60000,
    error: "runtime_release_unavailable",
  });
