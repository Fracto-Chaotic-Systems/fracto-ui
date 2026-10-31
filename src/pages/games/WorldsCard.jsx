import { Link } from "react-router-dom";
import AppText from "../../AppText.jsx";
import { WORLDS_TEXT } from "../../text/GamesText.jsx";
import PropTypes from "prop-types";
import { render_pattern_block } from "../study/StudyUtils.jsx";
import { AssociationCard, ThemePatternButton } from "./GamesWorldsStyles.jsx";

const WorldsCard = ({
  contender,
  assigned_row,
  details,
  on_show_assignment,
}) => (
  <AssociationCard $compact={!details} title={contender.gloss}>
    {details ? (
      <strong>{contender.label}</strong>
    ) : (
      <span>
        <strong>{contender.label}:</strong>{" "}
        {contender.definition ?? contender.gloss.split(";")[0].trim()}
      </span>
    )}
    {details && (
      <small>
        {contender.gloss} (
        <Link to={`/games?synset=${encodeURIComponent(contender.id)}`}>
          {contender.id}
        </Link>
        )
      </small>
    )}
    {details && assigned_row && (
      <ThemePatternButton
        type="button"
        aria-label={`${AppText.get(WORLDS_TEXT.show_card)} ${assigned_row}`}
        onClick={() => on_show_assignment?.(assigned_row)}
      >
        {render_pattern_block(Number(assigned_row), 20)}
      </ThemePatternButton>
    )}
  </AssociationCard>
);
WorldsCard.propTypes = {
  contender: PropTypes.object.isRequired,
  assigned_row: PropTypes.string,
  details: PropTypes.bool,
  on_show_assignment: PropTypes.func,
};
export default WorldsCard;
