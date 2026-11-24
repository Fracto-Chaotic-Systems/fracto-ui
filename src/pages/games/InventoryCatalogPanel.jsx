import CoolIconLink from "../../utils/ui/CoolIconLink.jsx";
import { check_icon, cancel_icon } from "../../utils/ui/CoolIcons.jsx";
import { Fragment, useState, useEffect } from "react";
import AppText from "../../AppText.jsx";
import { INVENTORY_CATALOG_TEXT } from "../../text/GamesText.jsx";
import InventoryCatalogEditor from "./InventoryCatalogEditor.jsx";
import useInventoryCatalog from "./useInventoryCatalog.js";
import { ATTRIBUTION_FIELDS, safe_catalog_url } from "./InventoryCatalog.js";
import {
  CatalogPanel,
  CatalogMoveForm,
  CatalogActions,
  CatalogMessage,
} from "./InventoryCatalogStyles.jsx";

const text = (key) => AppText.get(INVENTORY_CATALOG_TEXT[key]);
export default function InventoryCatalogPanel({
  asset_id,
  on_saved,
  folders = [],
  on_editing_change,
  editing_disabled = false,
}) {
  const [moving, set_moving] = useState(false);
  const catalog = useInventoryCatalog(asset_id, on_saved);
  const { record, busy, editing, message, load_error } = catalog;
  useEffect(() => {
    on_editing_change?.(editing);
    return () => on_editing_change?.(false);
  }, [editing, on_editing_change]);
  const display_value = (field) => {
    const value = record.attribution[field];
    const url = field.endsWith("_url") ? safe_catalog_url(value) : null;
    return url ? (
      <a href={url} target="_blank" rel="noreferrer">
        {value}
      </a>
    ) : (
      value || text("missing")
    );
  };
  return (
    <CatalogPanel aria-label={text("title")}>
      <h2>{text("title")}</h2>
      {load_error && (
        <CatalogMessage role="alert">{text("load_error")}</CatalogMessage>
      )}
      {!record ? (
        <>
          {!load_error && <p role="status">{text("loading")}</p>}
          {load_error && (
            <button onClick={catalog.reload}>{text("reload")}</button>
          )}
        </>
      ) : (
        <>
          <CatalogActions>
            <button
              type="button"
              disabled={editing || busy || load_error || editing_disabled}
              onClick={() => {
                catalog.edit();
                set_moving(true);
              }}
            >
              {text("move_folder")}
            </button>
            <button
              type="button"
              disabled={editing || busy || load_error || editing_disabled}
              onClick={() => {
                set_moving(false);
                catalog.edit();
              }}
            >
              {text("edit")}
            </button>
            <button type="button" disabled={busy} onClick={catalog.reload}>
              {text(editing ? "discard_reload" : "reload")}
            </button>
          </CatalogActions>
          {editing && !moving && (
            <InventoryCatalogEditor
              folder_path={catalog.folder_path}
              set_folder_path={catalog.set_folder_path}
              fields={catalog.fields}
              set_fields={catalog.set_fields}
              note={catalog.note}
              set_note={catalog.set_note}
              on_save={catalog.save}
              on_cancel={catalog.cancel}
              busy={busy}
            />
          )}
          {editing && moving && (
            <CatalogMoveForm
              onSubmit={catalog.save}
              onKeyDown={(event) => {
                if (event.key === "Escape" && !busy) {
                  event.preventDefault();
                  catalog.cancel();
                }
              }}
            >
              <label>
                {text("folder_path")}
                <select
                  value={catalog.folder_path}
                  disabled={busy}
                  onChange={(event) =>
                    catalog.set_folder_path(event.target.value)
                  }
                >
                  <option value="">{text("folder_root")}</option>
                  {[
                    ...new Set(
                      [...folders, record.folder_path].filter(Boolean),
                    ),
                  ]
                    .sort()
                    .map((path) => (
                      <option key={path} value={path}>
                        {path}
                      </option>
                    ))}
                </select>
              </label>
              <CoolIconLink
                title={text("move_folder")}
                icon={check_icon}
                color="#17803d"
                type="submit"
                disabled={busy}
              />
              <CoolIconLink
                title={text("cancel")}
                icon={cancel_icon}
                color="#c62828"
                on_click={catalog.cancel}
                disabled={busy}
              />
            </CatalogMoveForm>
          )}
          <strong>{record.name}</strong>
          <p>{record.description}</p>
          <dl>
            <dt>{text("id")}</dt>
            <dd>{record.id}</dd>
            <dt>{text("version")}</dt>
            <dd>{record.version}</dd>
            <dt>{text("folder_path")}</dt>
            <dd>{record.folder_path || text("folder_root")}</dd>
            {ATTRIBUTION_FIELDS.map((field) => (
              <Fragment key={field}>
                <dt>{text(field)}</dt>
                <dd>{display_value(field)}</dd>
              </Fragment>
            ))}
          </dl>

          <p>{text("direct_help")}</p>
          {message && (
            <CatalogMessage role="status">{text(message)}</CatalogMessage>
          )}
          <h3>{text("sources")}</h3>
          <ul>
            {record.sources.map((source, index) => (
              <li key={`${source.path}-${index}`}>
                <strong>{source.format.toUpperCase()}</strong> · {source.path}
              </li>
            ))}
          </ul>
          <h3>{text("history")}</h3>
          <ol>
            {record.history.map((entry, index) => (
              <li key={index}>
                <time>{entry.date}</time> · {entry.action}
                <p>{entry.description}</p>
              </li>
            ))}
          </ol>
        </>
      )}
    </CatalogPanel>
  );
}
