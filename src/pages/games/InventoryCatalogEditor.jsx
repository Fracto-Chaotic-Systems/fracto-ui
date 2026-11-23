import AppText from "../../AppText.jsx";
import { INVENTORY_CATALOG_TEXT } from "../../text/GamesText.jsx";
import { ATTRIBUTION_FIELDS } from "./InventoryCatalog.js";
import { CatalogActions, CatalogForm } from "./InventoryCatalogStyles.jsx";

const text = (key) => AppText.get(INVENTORY_CATALOG_TEXT[key]);
const MULTILINE = new Set([
  "credit_text",
  "modification_conditions",
  "redistribution_conditions",
  "notes",
]);

export default function InventoryCatalogEditor({
  folder_path,
  set_folder_path,
  fields,
  set_fields,
  note,
  set_note,
  on_save,
  on_cancel,
  busy = false,
}) {
  return (
    <CatalogForm onSubmit={on_save}>
      <fieldset disabled={busy}>
        <label>
          {text("folder_path")}
          <input
            type="text"
            maxLength={512}
            value={folder_path}
            onChange={(event) => set_folder_path(event.target.value)}
          />
          <small>{text("folder_help")}</small>
        </label>
        {ATTRIBUTION_FIELDS.map((field) => (
          <label key={field}>
            {text(field)}
            {MULTILINE.has(field) ? (
              <textarea
                maxLength={10000}
                value={fields[field]}
                onChange={(event) =>
                  set_fields({ ...fields, [field]: event.target.value })
                }
              />
            ) : (
              <input
                type={field.endsWith("_url") ? "url" : "text"}
                maxLength={10000}
                value={fields[field]}
                onChange={(event) =>
                  set_fields({ ...fields, [field]: event.target.value })
                }
              />
            )}
          </label>
        ))}
        <label>
          {text("add_note")}
          <textarea
            maxLength={10000}
            value={note}
            onChange={(event) => set_note(event.target.value)}
          />
        </label>
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
