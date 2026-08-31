import {FRACTO_SERVER_PORT} from "../../../../constants.js";
import {service_origin} from "../utils/service_origin.jsx";
import {request_json} from "./BackendUtils.jsx";

const SERVER_ORIGIN = service_origin(FRACTO_SERVER_PORT)

export class ServerBackend {
   static health = () => request_json(`${SERVER_ORIGIN}/healthz`)
   static readiness = () => request_json(`${SERVER_ORIGIN}/readyz`)
}

export default ServerBackend
