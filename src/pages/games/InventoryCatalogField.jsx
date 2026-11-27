import { useEffect, useRef, useState } from "react";
import CoolIconLink from "../../utils/ui/CoolIconLink.jsx";
import CoolEditLink from "../../utils/ui/CoolEditLink.jsx";
import { check_icon, cancel_icon } from "../../utils/ui/CoolIcons.jsx";
import AppText from "../../AppText.jsx";
import { INVENTORY_CATALOG_TEXT } from "../../text/GamesText.jsx";
import { CatalogValue, CatalogFieldForm } from "./InventoryCatalogStyles.jsx";

const text = (key) => AppText.get(INVENTORY_CATALOG_TEXT[key]);
export const MULTILINE_FIELDS = new Set([
  "credit_text",
  "modification_conditions",
  "redistribution_conditions",
  "notes",
]);

/**
 * One attribution value in the details tab: click it (or its pencil) to edit in
 * place with the green check (save) and red X (cancel); Escape cancels.
 */
export default function InventoryCatalogField({
  field,
  value = "",
  url = null,
  editing,
  disabled = false,
  busy = false,
  on_begin,
  on_cancel,
  on_save,
}) {
  const [draft, set_draft] = useState(value);
  const input = useRef(null);
  useEffect(() => {
    if (editing && !busy) input.current?.focus();
  }, [editing, busy]);
  if (!editing) {
    const begin = () => {
      if (disabled) return;
      set_draft(value);
      on_begin(field);
    };
    return (
      <CatalogValue>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer">
            {value}
          </a>
        ) : (
          <button
            type="button"
            className="catalog-value"
            disabled={disabled}
            onClick={begin}
          >
            {value || text("missing")}
          </button>
        )}
        <CoolEditLink
          title={text("edit_value")}
          className="catalog-edit-action"
          disabled={disabled}
          on_click={begin}
        />
      </CatalogValue>
    );
  }
  const multiline = MULTILINE_FIELDS.has(field);
  const Input = multiline ? "textarea" : "input";
  return (
    <CatalogFieldForm
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || disabled) return;
        if (draft === value) return on_cancel();
        await on_save(field, draft);
      }}
    >
      <Input
        ref={input}
        aria-label={text(field)}
        {...(multiline
          ? { rows: 3 }
          : { type: field.endsWith("_url") ? "url" : "text" })}
        maxLength={10000}
        value={draft}
        disabled={busy}
        onChange={(event) => set_draft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !busy) {
            event.preventDefault();
            on_cancel();
          }
        }}
      />
      <CoolIconLink
        title={text("accept_value")}
        icon={check_icon}
        color="#17803d"
        type="submit"
        disabled={busy || disabled}
      />
      <CoolIconLink
        title={text("cancel")}
        icon={cancel_icon}
        color="#c62828"
        on_click={on_cancel}
        disabled={busy}
      />
    </CatalogFieldForm>
  );
}
