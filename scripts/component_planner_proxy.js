import { create_http_proxy } from "@fracto/sdk/utils/HttpProxy.js";
export const create_component_planner_proxy = () =>
  create_http_proxy({
    origin: () =>
      `http://127.0.0.1:${Number(process.env.FRACTO_AI_PORT || 3007)}`,
    prefix: "/construction",
    timeout_ms: 180000,
    error: "CONSTRUCTION_UNAVAILABLE",
  });
