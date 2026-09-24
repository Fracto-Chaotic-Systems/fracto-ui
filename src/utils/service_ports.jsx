import { request_json } from "../backend/BackendUtils.jsx";

const ADMIN_PORT = Number(import.meta.env.VITE_FRACTO_ADMIN_PORT || 3005);
const ports = {};
let ready;

const admin_origin = () => {
  if (typeof window === "undefined") return `http://localhost:${ADMIN_PORT}`;
  const origin = new URL(window.location.origin);
  origin.port = `${ADMIN_PORT}`;
  return origin.origin;
};

/** Loads the installation's runtime service-port map from admin. */
export const initialize_service_ports = async () => {
  if (!ready) {
    ready = request_json(`${admin_origin()}/ports`).then((payload) => {
      Object.assign(ports, payload.ports || {});
      if (!Object.keys(ports).length) throw new Error("Admin returned no service ports");
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
  const origin = new URL(window.location.origin);
  origin.port = `${port}`;
  return origin.origin;
};

export const get_service_port = (service_name) => ports[service_name];

export default service_origin;
