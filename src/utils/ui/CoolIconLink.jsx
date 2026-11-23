import PropTypes from "prop-types";

/** Compact icon action with an accessible label and native disabled behavior. */
export default function CoolIconLink({
  title,
  icon,
  on_click,
  disabled = false,
  type = "button",
  color = "#245c78",
  className,
}) {
  return (
    <button
      type={type}
      title={title}
      aria-label={title}
      onClick={on_click}
      disabled={disabled}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        color,
        background: "none",
        border: 0,
        padding: "0.125rem",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      {icon}
    </button>
  );
}
CoolIconLink.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  on_click: PropTypes.func,
  type: PropTypes.oneOf(["button", "submit"]),
  color: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};
