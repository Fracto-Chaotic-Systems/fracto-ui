import { useState } from "react";
import { construction_text as text } from "./ComponentToolFields.jsx";
import ComponentFloorTools from "./ComponentFloorTools.jsx";
import ComponentPlacementTools from "./ComponentPlacementTools.jsx";
import ComponentScatterTools from "./ComponentScatterTools.jsx";
import { ConstructionToolsStyles } from "./ComponentConstructionStyles.jsx";
export default function ComponentConstructionTools({
  document,
  tools,
  editor,
  selected,
  on_select,
}) {
  const [error, set_error] = useState(null);
  const object = document.objects.find((item) => item.id === selected),
    rule = document.scatters.find((item) => item.id === selected);
  const selection = object || rule || (selected === "floor" && document.floor);
  const material_key = tools.material
    ? `${tools.material.material.id}:${tools.material.material.revision}`
    : "";
  const shared = {
    material: tools.material,
    busy: tools.busy || editor.busy,
    execute: (commands) => {
      set_error(null);
      return tools.execute(commands);
    },
    on_error: set_error,
    on_select,
  };
  return (
    <ConstructionToolsStyles
      aria-label={text("title")}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <h3>{text("title")}</h3>
      <p>
        {text("chosen")}:{" "}
        {tools.material?.material.name || text("choose_material")}
      </p>
      {tools.material && !tools.material.material.placement_ready && (
        <p>{text("material_not_calibrated")}</p>
      )}
      {tools.busy && <p role="status">{text("loading_content")}</p>}
      {(error || tools.error || editor.construction_error) && (
        <p role="alert">
          {text(error || tools.error || editor.construction_error)}
        </p>
      )}
      <label>
        {text("selection")}
        <select
          value={selection ? selected : ""}
          onChange={(event) => on_select(event.target.value)}
        >
          <option value="">{text("none")}</option>
          {document.floor && <option value="floor">{text("floor")}</option>}
          {document.objects.map((item, index) => (
            <option key={item.id} value={item.id}>
              {text("object")} {index + 1}: {item.asset.id}
            </option>
          ))}
          {document.scatters.map((item, index) => (
            <option key={item.id} value={item.id}>
              {text("scatter")} {index + 1}: {item.asset.id}
            </option>
          ))}
        </select>
      </label>
      <button
        disabled={!selection || shared.busy}
        onClick={() => {
          void shared.execute(
            selected === "floor"
              ? [{ type: "set-floor", floor: null }]
              : [{ type: "remove", id: selected }],
          );
          on_select("");
        }}
      >
        {text("remove")}
      </button>
      <ComponentFloorTools
        key={`floor:${JSON.stringify(document.floor)}:${material_key}`}
        floor={document.floor}
        {...shared}
      />
      <ComponentPlacementTools
        key={`object:${JSON.stringify(object)}:${material_key}`}
        object={object}
        {...shared}
      />
      <ComponentScatterTools
        key={`scatter:${JSON.stringify(rule)}:${material_key}`}
        rule={rule}
        {...shared}
      />
      <p>{text("tool_help")}</p>
    </ConstructionToolsStyles>
  );
}
