import AppText from "../../AppText.jsx";
import { MATERIAL_TEXT } from "../../text/GamesText.jsx";
import {
  MATERIAL_AXES,
  MATERIAL_PLACEMENTS,
  MATERIAL_UNITS,
} from "@fracto/sdk/FractoMaterialMetadata.js";
import { MATERIAL_VECTOR_FIELDS } from "./MaterialMetadataForm.js";
import { CatalogForm, CatalogActions } from "./InventoryCatalogStyles.jsx";
const text = (key) => AppText.get(MATERIAL_TEXT[key]);
export default function MaterialMetadataEditor({
  form,
  on_change,
  on_save,
  on_cancel,
  busy,
}) {
  const set = (key, value) => on_change({ ...form, [key]: value });
  const choice = (key, values) => (
    <label key={key}>
      {text(key)}
      <select
        value={form[key]}
        onChange={(event) => {
          const value = event.target.value;
          if (key === "source_units" && value)
            on_change({
              ...form,
              source_units: value,
              meters_per_unit: String(
                { m: 1, cm: 0.01, mm: 0.001, ft: 0.3048, in: 0.0254 }[value],
              ),
            });
          else set(key, value);
        }}
      >
        {values.map((value) => (
          <option key={value} value={value}>
            {text(value || "unknown")}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <CatalogForm onSubmit={on_save}>
      <fieldset disabled={busy}>
        <p>{text("help")}</p>
        <label>
          {text("description")}
          <textarea
            maxLength={10000}
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
          />
        </label>
        <label>
          {text("tags")}
          <input
            maxLength={2110}
            value={form.tags}
            onChange={(event) => set("tags", event.target.value)}
          />
        </label>
        {choice("kind", ["unknown", "model", "surface"])}
        {choice("placement", MATERIAL_PLACEMENTS)}
        {choice("source_units", ["", ...MATERIAL_UNITS])}
        <label>
          {text("meters_per_unit")}
          <input
            type="number"
            min="0.000001"
            max="10000"
            step="any"
            value={form.meters_per_unit}
            onChange={(event) => set("meters_per_unit", event.target.value)}
          />
        </label>
        {choice("up_axis", ["", ...MATERIAL_AXES])}
        {choice("forward_axis", ["", ...MATERIAL_AXES])}
        {MATERIAL_VECTOR_FIELDS.map((key) => (
          <label key={key}>
            {text(key)}
            <input
              maxLength={120}
              value={form[key]}
              onChange={(event) => set(key, event.target.value)}
            />
          </label>
        ))}
        <CatalogActions>
          <button type="submit">{text("save")}</button>
          <button type="button" onClick={on_cancel}>
            {text("cancel")}
          </button>
        </CatalogActions>
      </fieldset>
    </CatalogForm>
  );
}
