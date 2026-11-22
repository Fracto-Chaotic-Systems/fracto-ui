import { Fragment } from "react";
import AppText from "../../AppText.jsx";
import { INVENTORY_CATALOG_TEXT } from "../../text/GamesText.jsx";
import InventoryCatalogEditor from "./InventoryCatalogEditor.jsx";
import useInventoryCatalog from "./useInventoryCatalog.js";
import { ATTRIBUTION_FIELDS, safe_catalog_url } from "./InventoryCatalog.js";
import {
  CatalogPanel,
  CatalogActions,
  CatalogMessage,
} from "./InventoryCatalogStyles.jsx";

const text = (key) => AppText.get(INVENTORY_CATALOG_TEXT[key]);
export default function InventoryCatalogPanel({ asset_id }) {
  const catalog = useInventoryCatalog(asset_id);
  const { record, busy, editing, message, load_error } = catalog;
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
          <strong>{record.name}</strong>
          <p>{record.description}</p>
          <dl>
            <dt>{text("id")}</dt>
            <dd>{record.id}</dd>
            <dt>{text("version")}</dt>
            <dd>{record.version}</dd>
            {ATTRIBUTION_FIELDS.map((field) => (
              <Fragment key={field}>
                <dt>{text(field)}</dt>
                <dd>{display_value(field)}</dd>
              </Fragment>
            ))}
          </dl>
          <CatalogActions>
            <button
              type="button"
              disabled={editing || busy || load_error}
              onClick={catalog.edit}
            >
              {text("edit")}
            </button>
            <button type="button" disabled={busy} onClick={catalog.reload}>
              {text(editing ? "discard_reload" : "reload")}
            </button>
          </CatalogActions>
          <p>{text("direct_help")}</p>
          {message && (
            <CatalogMessage role="status">{text(message)}</CatalogMessage>
          )}
          {editing && (
            <InventoryCatalogEditor
              fields={catalog.fields}
              set_fields={catalog.set_fields}
              note={catalog.note}
              set_note={catalog.set_note}
              on_save={catalog.save}
              on_cancel={catalog.cancel}
              busy={busy}
            />
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
