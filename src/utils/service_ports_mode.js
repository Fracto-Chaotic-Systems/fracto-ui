const DIRECT_UI_PORTS = new Set(["3006", "3106"]);

export const uses_same_origin_proxy_for_port = (port) =>
  !DIRECT_UI_PORTS.has(`${port || ""}`);
