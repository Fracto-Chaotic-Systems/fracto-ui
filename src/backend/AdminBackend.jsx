import {FRACTO_ADMIN_PORT} from "../../../../constants.js";
import {service_origin} from "../utils/service_origin.jsx";
import {request_json} from "./BackendUtils.jsx";

const ADMIN_ORIGIN = service_origin(FRACTO_ADMIN_PORT)

export class AdminBackend {
   static version = service_name => request_json(
      `${ADMIN_ORIGIN}/version?service_name=${encodeURIComponent(service_name)}`)
}

export default AdminBackend
