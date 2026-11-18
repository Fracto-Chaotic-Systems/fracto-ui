import { create_flight_worker_runtime } from "./FlightWorkerRuntime.js";

const runtime = create_flight_worker_runtime((message, transfer = []) =>
  self.postMessage(message, transfer),
);
self.onmessage = ({ data }) => runtime.receive(data);
