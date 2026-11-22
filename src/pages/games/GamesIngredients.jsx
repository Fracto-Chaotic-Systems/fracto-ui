import AppText from "../../AppText.jsx";
import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import { KEY_GAMES_INVENTORY_TITLE } from "../../text/GamesText.jsx";
import GamesInventory from "./GamesInventory.jsx";

export default function GamesIngredients() {
  return (
    <GamesInventory category="material">
      <styles.SectionTitle>
        {AppText.get(KEY_GAMES_INVENTORY_TITLE)}
      </styles.SectionTitle>
    </GamesInventory>
  );
}
