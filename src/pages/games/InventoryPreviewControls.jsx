import AppText from "../../AppText.jsx";
import { INVENTORY_TEXT } from "../../text/GamesText.jsx";
import {
  FIRE_CARDINALITIES,
  FIRE_PALETTES,
} from "@fracto/sdk/FractoMaterialEffects.js";

/**
 * Right-panel preview controls shared by every asset page (materials and
 * components today). Each page decides where values live: material previews
 * keep them in view state, components store lighting in the document.
 */
const text = (key) => AppText.get(INVENTORY_TEXT[key]);

/** Lighting and scale bounds shared by all asset previews. */
export const PREVIEW_RANGES = {
  scale: { min: 0.1, max: 2, step: 0.05, suffix: "×" },
  direction: { min: 0, max: 360, step: 5, suffix: "°" },
  intensity: { min: 0.25, max: 6, step: 0.25, suffix: "" },
};

/** A labelled slider with its value; only finite in-range values are reported. */
export function PreviewRange({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  disabled = false,
  on_change,
}) {
  return (
    <label>
      {label}{" "}
      <output>
        {value}
        {suffix}
      </output>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (!disabled && Number.isFinite(next) && next >= min && next <= max)
            on_change(next);
        }}
      />
    </label>
  );
}

/** "Play animation" for previews whose model has animation clips. */
export function PreviewAnimationToggle({
  checked,
  on_change,
  disabled = false,
}) {
  return (
    <label>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => on_change(event.target.checked)}
      />
      {text("animation")}
    </label>
  );
}

/**
 * Flame color for previews with fire effects: "saved", or one of the supported
 * cardinalities, whose orbital pattern color the flame takes.
 */
export function PreviewFlameColor({ value, on_change, disabled = false }) {
  return (
    <label>
      {text("flame_color")}{" "}
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: "0.9em",
          height: "0.9em",
          verticalAlign: "middle",
          borderRadius: "50%",
          background:
            value === "saved" ? "transparent" : FIRE_PALETTES[value]?.body,
        }}
      />{" "}
      <select
        value={String(value)}
        disabled={disabled}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === "saved") return on_change("saved");
          const next = Number(raw);
          if (FIRE_CARDINALITIES.includes(next)) on_change(next);
        }}
      >
        <option value="saved">{text("flame_saved")}</option>
        {FIRE_CARDINALITIES.map((cardinality) => (
          <option key={cardinality} value={String(cardinality)}>
            {text("flame_pattern").replace("{cardinality}", cardinality)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Preview scale with the resulting height in metres. */
export function PreviewScaleControls({
  scale,
  height = null,
  on_change,
  disabled = false,
}) {
  return (
    <>
      <PreviewRange
        label={text("scale")}
        value={scale}
        {...PREVIEW_RANGES.scale}
        disabled={disabled}
        on_change={on_change}
      />
      <div>
        {text("height")}:{" "}
        <output>
          {Number.isFinite(height) ? (height * scale).toFixed(2) : "—"} m
        </output>
      </div>
    </>
  );
}

/** Light direction and intensity; `on_change(field, value)` with field "direction" or "intensity". */
export function PreviewLightingControls({
  direction,
  intensity,
  on_change,
  disabled = false,
}) {
  return (
    <>
      <PreviewRange
        label={text("lighting")}
        value={direction}
        {...PREVIEW_RANGES.direction}
        disabled={disabled}
        on_change={(value) => on_change("direction", value)}
      />
      <PreviewRange
        label={text("strength")}
        value={intensity}
        {...PREVIEW_RANGES.intensity}
        disabled={disabled}
        on_change={(value) => on_change("intensity", value)}
      />
    </>
  );
}
