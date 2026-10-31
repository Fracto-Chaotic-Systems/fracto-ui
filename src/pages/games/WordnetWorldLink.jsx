import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import AppText from "../../AppText.jsx";
import { WORLDS_TEXT } from "../../text/GamesText.jsx";
import { DataBackend } from "../../backend/DataBackend.jsx";
import { index_world_mappings } from "./WorldsDatabase.js";
import { render_pattern_block } from "../study/StudyUtils.jsx";
import { WorldPatternLink } from "./GamesWordnetStyles.jsx";

const WordnetWorldLink = ({ synset_id }) => {
  const [assignments, set_assignments] = useState({});
  const [failed, set_failed] = useState(false);
  const [attempt, set_attempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    DataBackend.get_wordnet_mappings(controller.signal)
      .then((response) => {
        const data = index_world_mappings(response.result);
        if (!controller.signal.aborted)
          set_assignments(
            Object.fromEntries(
              Object.entries(data.mapping).map(([card, id]) => [id, card]),
            ),
          );
      })
      .catch(() => {
        if (!controller.signal.aborted) set_failed(true);
      });
    return () => controller.abort();
  }, [attempt]);
  const card = assignments[synset_id];
  if (failed)
    return (
      <p role="alert">
        {AppText.get(WORLDS_TEXT.error)}{" "}
        <button
          type="button"
          onClick={() => {
            set_failed(false);
            set_attempt((value) => value + 1);
          }}
        >
          {AppText.get(WORLDS_TEXT.retry)}
        </button>
      </p>
    );
  return card ? (
    <WorldPatternLink
      as={Link}
      to={`/games?card=${card}`}
      aria-label={`${AppText.get(WORLDS_TEXT.show_card)} ${card}`}
    >
      {render_pattern_block(Number(card), 20)}
    </WorldPatternLink>
  ) : null;
};
WordnetWorldLink.propTypes = { synset_id: PropTypes.string.isRequired };
export default WordnetWorldLink;
