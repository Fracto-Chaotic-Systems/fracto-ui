import AppText from "../../AppText.jsx";
import { AUTO_PILOT_TEXT } from "../../text/GamesText.jsx";
import DashboardSwitch from "./DashboardSwitch.jsx";
export default function AutoPilotSwitch(props) {
  return (
    <DashboardSwitch
      {...props}
      side="right"
      label={AppText.get(AUTO_PILOT_TEXT.label)}
      caption={AppText.get(AUTO_PILOT_TEXT.caption)}
    />
  );
}
