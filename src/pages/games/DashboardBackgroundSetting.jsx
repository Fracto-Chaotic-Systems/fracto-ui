import styled from "styled-components";
import AppSettings from "../../AppSettings.jsx";
import AppText from "../../AppText.jsx";
import { KEY_GAMES_PLAY_DASHBOARD_BACKGROUND } from "../../settings/GamesSettings.jsx";
import { DASHBOARD_BACKGROUND_TEXT } from "../../text/GamesText.jsx";
import {
  DASHBOARD_BACKGROUNDS,
  normalize_dashboard_background,
} from "./DashboardBackground.js";
import { useDashboardBackground } from "./useDashboardBackground.js";

const BackgroundField = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.25rem 0 0.25rem var(--section-label-indent);
  > select {
    padding: 0.375rem 0.5rem;
  }
`;

export default function DashboardBackgroundSetting() {
  const value = useDashboardBackground();
  return (
    <BackgroundField>
      {AppText.get(DASHBOARD_BACKGROUND_TEXT.label)}
      <select
        value={value}
        onChange={(event) =>
          AppSettings.on_settings_changed({
            [KEY_GAMES_PLAY_DASHBOARD_BACKGROUND]:
              normalize_dashboard_background(event.target.value),
          })
        }
      >
        {DASHBOARD_BACKGROUNDS.map((code) => (
          <option key={code} value={code}>
            {AppText.get(DASHBOARD_BACKGROUND_TEXT[code])}
          </option>
        ))}
      </select>
    </BackgroundField>
  );
}
