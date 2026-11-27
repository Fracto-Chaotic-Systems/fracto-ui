import { useEffect, useRef, useState } from "react";
import CoolIconLink from "../../utils/ui/CoolIconLink.jsx";
import CoolEditLink from "../../utils/ui/CoolEditLink.jsx";
import { check_icon, cancel_icon } from "../../utils/ui/CoolIcons.jsx";
import AppText from "../../AppText.jsx";
import { INVENTORY_CATALOG_TEXT } from "../../text/GamesText.jsx";
import { InventoryNameRow } from "./InventoryStyles.jsx";

const text = (key) => AppText.get(INVENTORY_CATALOG_TEXT[key]);
/** The SDK's component label rule: 1–120 characters, no control characters. */
export const valid_component_name = (value) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.trim().length <= 120 &&
  ![...value].some((char) => char.charCodeAt(0) < 32);

/** Component name with the pencil and the green check / red X; saved at once by `on_rename`. */
export default function ComponentNameEdit({
  name,
  disabled = false,
  on_rename,
}) {
  const [editing, set_editing] = useState(false);
  const [draft, set_draft] = useState(name);
  const [invalid, set_invalid] = useState(false);
  const input = useRef(null);
  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    }
  }, [editing]);
  const cancel = () => {
    set_editing(false);
    set_invalid(false);
  };
  if (!editing)
    return (
      <InventoryNameRow>
        <strong>{name}</strong>
        <CoolEditLink
          title={text("rename")}
          disabled={disabled}
          on_click={() => {
            if (disabled) return;
            set_draft(name);
            set_invalid(false);
            set_editing(true);
          }}
        />
      </InventoryNameRow>
    );
  return (
    <>
      <InventoryNameRow
        as="form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (disabled) return;
          if (!valid_component_name(draft)) return set_invalid(true);
          // Saved at once; a failed save keeps the editor open with the draft.
          if (
            draft.trim() !== name &&
            (await on_rename(draft.trim())) === false
          )
            return;
          cancel();
        }}
      >
        <input
          ref={input}
          required
          aria-label={text("new_name")}
          maxLength={120}
          value={draft}
          disabled={disabled}
          onChange={(event) => set_draft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              cancel();
            }
          }}
        />
        <CoolIconLink
          title={text("accept_rename")}
          icon={check_icon}
          color="#17803d"
          type="submit"
          disabled={disabled}
        />
        <CoolIconLink
          title={text("cancel")}
          icon={cancel_icon}
          color="#c62828"
          on_click={cancel}
        />
      </InventoryNameRow>
      {invalid && <p role="alert">{text("rename_invalid")}</p>}
    </>
  );
}
