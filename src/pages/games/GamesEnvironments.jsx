import AppText from "../../AppText.jsx";
import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import { KEY_GAMES_ENVIRONMENTS_TITLE } from "../../text/GamesText.jsx";
import GamesInventory from "./GamesInventory.jsx";

export default function GamesEnvironments() {
  return (
    <GamesInventory category="area">
      <styles.SectionTitle>
        {AppText.get(KEY_GAMES_ENVIRONMENTS_TITLE)}
      </styles.SectionTitle>
    </GamesInventory>
  );
}
