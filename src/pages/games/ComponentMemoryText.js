import AppText from "../../AppText.jsx";
import { CONSTRUCTION_MEMORY_TEXT } from "../../text/GamesText.jsx";
export const memory_text = (key) =>
  AppText.get(
    CONSTRUCTION_MEMORY_TEXT[
      Object.hasOwn(CONSTRUCTION_MEMORY_TEXT, key) ? key : "memory_invalid"
    ],
  );
