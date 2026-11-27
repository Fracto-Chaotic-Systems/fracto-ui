import AppText from "../../AppText.jsx";
import { NIGHT_FLIGHT_TEXT } from "../../text/GamesText.jsx";
import { set_night_flight } from "./useNightFlight.js";
import DashboardSwitch from "./DashboardSwitch.jsx";
export default function NightFlightSwitch({ enabled, ...props }) {
  return (
    <DashboardSwitch
      {...props}
      enabled={enabled}
      night={enabled}
      on_change={set_night_flight}
      label={AppText.get(NIGHT_FLIGHT_TEXT.label)}
      caption={AppText.get(NIGHT_FLIGHT_TEXT.night)}
    />
  );
}
