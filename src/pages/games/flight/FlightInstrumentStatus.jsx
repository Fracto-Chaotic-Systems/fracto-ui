import { useSyncExternalStore } from "react";
import AppText from "../../../AppText.jsx";
import { FLIGHT_INSTRUMENT_TEXT } from "../../../text/GamesText.jsx";

export default function FlightInstrumentStatus({ flight_state }) {
  const read_source = () => flight_state.get_snapshot().source;
  const source = useSyncExternalStore(
    flight_state.subscribe,
    read_source,
    read_source,
  );
  return source === "unavailable"
    ? AppText.get(FLIGHT_INSTRUMENT_TEXT.unavailable)
    : null;
}
