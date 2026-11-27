import { useEffect, useRef } from "react";
import CoolIconLink from "../../utils/ui/CoolIconLink.jsx";
import { check_icon, cancel_icon } from "../../utils/ui/CoolIcons.jsx";
import AppText from "../../AppText.jsx";
import { INVENTORY_CATALOG_TEXT } from "../../text/GamesText.jsx";
import { InventoryNameRow, TreeActions } from "./InventoryStyles.jsx";

const text = (key) => AppText.get(INVENTORY_CATALOG_TEXT[key]);

/** New folder button, then the inline name row (input, green check, red X). */
export default function InventoryNewFolder({
  creation,
  disabled = false,
  button_disabled = false,
}) {
  const input = useRef(null);
  useEffect(() => {
    if (creation.editing && !creation.busy && !disabled) input.current?.focus();
  }, [creation.editing, creation.busy, disabled]);
  return (
    <>
      {creation.editing ? (
        <InventoryNameRow as="form" onSubmit={creation.save}>
          <input
            ref={input}
            required
            aria-label={text("new_folder_name")}
            maxLength={64}
            value={creation.name}
            disabled={disabled || creation.busy}
            onChange={(event) => creation.set_name(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !creation.busy) {
                event.preventDefault();
                creation.cancel();
              }
            }}
          />
          <CoolIconLink
            title={text("accept_new_folder")}
            icon={check_icon}
            color="#17803d"
            type="submit"
            disabled={disabled || creation.busy}
          />
          <CoolIconLink
            title={text("cancel")}
            icon={cancel_icon}
            color="#c62828"
            on_click={creation.cancel}
            disabled={creation.busy}
          />
        </InventoryNameRow>
      ) : (
        <TreeActions>
          <button
            type="button"
            disabled={disabled || button_disabled}
            onClick={creation.begin}
          >
            {text("new_folder")}
          </button>
        </TreeActions>
      )}
      {creation.error && <p role="alert">{text(creation.error)}</p>}
    </>
  );
}
