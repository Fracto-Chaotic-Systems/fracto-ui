import PropTypes from "prop-types";
import AppText from "../../AppText.jsx";
import { WORLDS_TEXT } from "../../text/GamesText.jsx";
import { AssociationCard } from "./GamesWorldsStyles.jsx";
import { WORLD_DRAG_TYPE } from "./WorldsMapping.js";

const WorldsCard = ({
  contender,
  selected,
  on_select,
  assigned_row,
  details,
}) => (
  <AssociationCard
    type="button"
    draggable
    $selected={selected}
    aria-pressed={selected}
    title={contender.gloss}
    onClick={() => on_select(contender.id)}
    onDragStart={(event) => {
      event.dataTransfer.setData(WORLD_DRAG_TYPE, contender.id);
      event.dataTransfer.effectAllowed = "move";
    }}
  >
    <strong>{contender.label}</strong>
    {details && <small>{contender.gloss}</small>}
    {details && (
      <small>
        {contender.id}
        {assigned_row
          ? ` - ${AppText.get(WORLDS_TEXT.mapped)} ${assigned_row}`
          : ""}
      </small>
    )}
  </AssociationCard>
);
WorldsCard.propTypes = {
  contender: PropTypes.object.isRequired,
  selected: PropTypes.bool.isRequired,
  on_select: PropTypes.func.isRequired,
  assigned_row: PropTypes.string,
  details: PropTypes.bool,
};
export default WorldsCard;
