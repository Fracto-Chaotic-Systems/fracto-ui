import AppText from "../../AppText.jsx";
import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import { KEY_GAMES_COMPOSITES_TITLE } from "../../text/GamesText.jsx";
import GamesInventory from "./GamesInventory.jsx";

export default function GamesComposites() {
  return (
    <GamesInventory>
      <styles.SectionTitle>
        {AppText.get(KEY_GAMES_COMPOSITES_TITLE)}
      </styles.SectionTitle>
    </GamesInventory>
  );
}
