import AppText from "../../AppText.jsx";
import { INVENTORY_TEXT, COMPONENT_STAGE_TEXT } from "../../text/GamesText.jsx";
import { component_lighting } from "@fracto/sdk/FractoComponentDocument.js";
import { StageLightingBar } from "./ComponentStageStyles.jsx";

export default function ComponentStageLightingControls({
  document,
  on_change,
  disabled,
  hidden,
}) {
  const lighting = component_lighting(document);
  const range = (field, label, min, max, step, suffix) => (
    <label>
      <span>
        {AppText.get(INVENTORY_TEXT[label])}{" "}
        <output>
          {lighting[field]}
          {suffix}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={lighting[field]}
        disabled={disabled}
        aria-label={AppText.get(INVENTORY_TEXT[label])}
        onChange={(event) => {
          const value = event.target.valueAsNumber;
          if (
            !disabled &&
            Number.isFinite(value) &&
            value >= min &&
            value <= max
          )
            on_change({
              ...document,
              lighting: { ...lighting, [field]: value },
            });
        }}
      />
    </label>
  );
  return (
    <StageLightingBar
      role="group"
      aria-label={AppText.get(COMPONENT_STAGE_TEXT.stage_lighting)}
      hidden={hidden}
    >
      {range("direction_degrees", "lighting", 0, 360, 5, "°")}
      {range("intensity", "strength", 0.25, 6, 0.25, "")}
    </StageLightingBar>
  );
}
