import AppText from "../../AppText.jsx";
import { CONSTRUCTION_TEXT } from "../../text/GamesText.jsx";
export const construction_text = (key) =>
  AppText.get(
    CONSTRUCTION_TEXT[
      Object.hasOwn(CONSTRUCTION_TEXT, key) ? key : "tool_error"
    ],
  );
export function component_vector(value, length) {
  const parts = value.split(",");
  if (
    parts.length !== length ||
    parts.some((part) => !part.trim() || !Number.isFinite(Number(part)))
  )
    throw new Error("invalid_construction_command");
  return parts.map(Number);
}
export function ComponentToolField({ label, value, on_change, type = "text" }) {
  return (
    <label>
      {construction_text(label)}
      <input
        type={type}
        maxLength={type === "text" ? 200 : undefined}
        step={type === "number" ? "any" : undefined}
        value={value}
        onChange={(event) => on_change(event.target.value)}
      />
    </label>
  );
}
