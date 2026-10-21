import PropTypes from "prop-types";
import { pencil_icon } from "./CoolIcons.jsx";

/** Compact link-styled edit action with native keyboard behavior. */
export default function CoolEditLink({ title, on_click }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={on_click}
      style={{
        display: "inline-flex",
        alignItems: "center",
        color: "#245c78",
        background: "none",
        border: 0,
        padding: "0.125rem",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {pencil_icon}
    </button>
  );
}
CoolEditLink.propTypes = {
  title: PropTypes.string.isRequired,
  on_click: PropTypes.func.isRequired,
};
