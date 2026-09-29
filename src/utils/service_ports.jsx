import { request_json } from "../backend/BackendUtils.jsx";
import { uses_same_origin_proxy_for_port } from "./service_ports_mode.js";

const ADMIN_PORT = Number(import.meta.env.VITE_FRACTO_ADMIN_PORT || 3005);
const ports = {};
let ready;

/**
 * The standalone production deployment is mounted under one TLS origin, with
 * nginx routing /api/<service>/ to the private service listeners. Keep direct
 * port origins for the existing local/Compose UI ports.
 */
const uses_same_origin_proxy = () => {
  if (typeof window === "undefined") return false;
  return uses_same_origin_proxy_for_port(window.location.port);
};

const admin_origin = () => {
  if (typeof window === "undefined") return `http://localhost:${ADMIN_PORT}`;
  if (uses_same_origin_proxy()) return `${window.location.origin}/api/admin`;
  const origin = new URL(window.location.origin);
  origin.port = `${ADMIN_PORT}`;
  return origin.origin;
};

/** Loads the installation's runtime service-port map from admin. */
export const initialize_service_ports = async () => {
  if (!ready) {
    ready = request_json(`${admin_origin()}/ports`).then((payload) => {
      const discovered_ports = payload.ports || {};
      const required_services = ["main", "data", "asset", "tiles", "admin"];
      if (required_services.some((service) => !discovered_ports[service])) {
        throw new Error("Admin returned an incomplete service port map");
      }
      Object.assign(ports, discovered_ports);
      return ports;
    });
  }
  return ready;
};

/** Returns a service origin after runtime discovery has completed. */
export const service_origin = (service_name) => {
  const port = ports[service_name];
  if (!port) throw new Error(`Service port has not been discovered: ${service_name}`);
  if (typeof window === "undefined") return `http://localhost:${port}`;
  if (uses_same_origin_proxy()) return `${window.location.origin}/api/${service_name}`;
  const origin = new URL(window.location.origin);
  origin.port = `${port}`;
  return origin.origin;
};

export const get_service_port = (service_name) => ports[service_name];

export default service_origin;
