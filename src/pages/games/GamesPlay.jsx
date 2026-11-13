import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import { KEY_GAMES_PLAY_TITLE } from "../../text/GamesText.jsx";

export default function GamesPlay() {
  return (
    <styles.SectionTitle>
      {AppText.get(KEY_GAMES_PLAY_TITLE)}
    </styles.SectionTitle>
  );
}
