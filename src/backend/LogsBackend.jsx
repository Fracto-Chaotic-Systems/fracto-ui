import {service_origin} from "../utils/service_origin.jsx";
import {request_json} from "./BackendUtils.jsx";

export class LogsBackend {
   static load = port => request_json(`${service_origin(port)}/logs`)
}

export default LogsBackend
