import { service_origin } from "../../../utils/service_origin.jsx";
import { create_flight_frame_session } from "./FlightFrameSession.js";

/** Production factory. Origin discovery stays on the UI thread, work stays in a module worker. */
export function create_flight_frame_client({
  worker_factory = () =>
    new Worker(new URL("./FlightFrame.worker.js", import.meta.url), {
      type: "module",
    }),
  ...options
} = {}) {
  const origin = service_origin("tiles");
  return create_flight_frame_session(worker_factory(), {
    ...options,
    tile_service_origin: origin,
  });
}
