import PropTypes from "prop-types";
import AppText from "../../AppText.jsx";
import { WORLDS_TEXT } from "../../text/GamesText.jsx";
import { NotesInput } from "./GamesWorldsStyles.jsx";

// Notes belong to the row; the page coordinates persistence with draft seeding.
const WorldsNotes = ({ cardinality, value, on_change }) => (
  <NotesInput
    aria-label={`${AppText.get(WORLDS_TEXT.notes)} ${cardinality}`}
    placeholder={AppText.get(WORLDS_TEXT.notes_placeholder)}
    rows={2}
    value={value}
    onChange={(event) => on_change(event.target.value)}
  />
);
WorldsNotes.propTypes = {
  cardinality: PropTypes.number.isRequired,
  value: PropTypes.string.isRequired,
  on_change: PropTypes.func.isRequired,
};
export default WorldsNotes;
