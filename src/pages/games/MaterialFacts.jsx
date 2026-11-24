import AppText from "../../AppText.jsx";
import { MATERIAL_TEXT } from "../../text/GamesText.jsx";
import { MATERIAL_VECTOR_FIELDS } from "./MaterialMetadataForm.js";
const text = (key) => AppText.get(MATERIAL_TEXT[key]);
export default function MaterialFacts({ material }) {
  const facts = material.construction;
  const value = (key) => {
    const current = facts[key];
    if (current === null) return text("unknown");
    if (Array.isArray(current)) return current.join(" × ");
    return [
      "kind",
      "placement",
      "source_units",
      "up_axis",
      "forward_axis",
    ].includes(key)
      ? text(current)
      : current;
  };
  return (
    <>
      <p>{material.description}</p>
      <p>{text(material.placement_ready ? "ready" : "incomplete")}</p>
      {!material.placement_ready && (
        <p>
          {text("missing")}: {material.missing_metadata.map(text).join(", ")}
        </p>
      )}
      <dl>
        {[
          "kind",
          "placement",
          "source_units",
          "meters_per_unit",
          ...MATERIAL_VECTOR_FIELDS,
          "up_axis",
          "forward_axis",
        ].map((key) => (
          <div key={key}>
            <dt>{text(key)}</dt>
            <dd>{value(key)}</dd>
          </div>
        ))}
      </dl>
      <p>
        {text("tags")}: {material.tags.join(", ") || text("unknown")}
      </p>
      <p>
        {text("reference")}: <code>{material.id}</code>
      </p>
      <p>
        {text("revision")}: <code>{material.revision}</code>
      </p>
    </>
  );
}
