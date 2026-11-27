import { Fragment, useEffect, useState } from "react";
import CoolTabs from "../../utils/ui/CoolTabs.jsx";
import AppText from "../../AppText.jsx";
import { INVENTORY_CATALOG_TEXT } from "../../text/GamesText.jsx";
import InventoryCatalogEditor from "./InventoryCatalogEditor.jsx";
import InventoryCatalogField from "./InventoryCatalogField.jsx";
import useInventoryCatalog from "./useInventoryCatalog.js";
import { ATTRIBUTION_FIELDS, safe_catalog_url } from "./InventoryCatalog.js";
import {
  CatalogPanel,
  CatalogTab,
  CatalogMessage,
} from "./InventoryCatalogStyles.jsx";

const text = (key) => AppText.get(INVENTORY_CATALOG_TEXT[key]);
export default function InventoryCatalogPanel({
  asset_id,
  on_saved,
  on_editing_change,
  editing_disabled = false,
  metadata = null,
  tab: shared_tab,
  on_tab,
}) {
  // The page may keep the selected tab so it survives panel remounts after saves.
  const [own_tab, set_own_tab] = useState(0);
  const set_tab = on_tab ?? set_own_tab;
  const active = Math.min(shared_tab ?? own_tab, metadata ? 3 : 2);
  const catalog = useInventoryCatalog(asset_id, on_saved);
  const { record, busy, editing, message, load_error } = catalog;
  // Only attribution values are editable, one at a time.
  const [editing_field, set_editing_field] = useState(null);
  const field_open = editing_field !== null;
  useEffect(() => {
    on_editing_change?.(editing || field_open);
    return () => on_editing_change?.(false);
  }, [editing, field_open, on_editing_change]);
  return (
    <CatalogPanel $bare aria-label={text("title")}>
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
        <CoolTabs
          labels={[
            text("tab_details"),
            text("tab_sources"),
            text("tab_history"),
            ...(metadata ? [text("tab_metadata")] : []),
          ]}
          tab_index={active}
          on_tab_select={set_tab}
          selected_content={
            // Every tab stays mounted so open edits keep their drafts.
            <div>
              <CatalogTab hidden={active !== 0}>
                {editing && (
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
                <dl>
                  <dt>{text("version")}</dt>
                  <dd>{record.version}</dd>
                  {ATTRIBUTION_FIELDS.map((field) => (
                    <Fragment key={field}>
                      <dt>{text(field)}</dt>
                      <dd>
                        <InventoryCatalogField
                          field={field}
                          value={record.attribution[field] || ""}
                          url={
                            field.endsWith("_url")
                              ? safe_catalog_url(record.attribution[field])
                              : null
                          }
                          editing={editing_field === field}
                          busy={busy}
                          disabled={
                            busy ||
                            editing ||
                            editing_disabled ||
                            (field_open && editing_field !== field)
                          }
                          on_begin={set_editing_field}
                          on_cancel={() => set_editing_field(null)}
                          on_save={async (key, value) => {
                            if (await catalog.save_field(key, value))
                              set_editing_field(null);
                          }}
                        />
                      </dd>
                    </Fragment>
                  ))}
                </dl>
                {message && (
                  <CatalogMessage role="status">{text(message)}</CatalogMessage>
                )}
              </CatalogTab>
              <CatalogTab hidden={active !== 1}>
                <ul>
                  {record.sources.map((source, index) => (
                    <li key={`${source.path}-${index}`}>
                      <strong>{source.format.toUpperCase()}</strong> ·{" "}
                      {source.path}
                    </li>
                  ))}
                </ul>
              </CatalogTab>
              <CatalogTab hidden={active !== 2}>
                <ol>
                  {record.history.map((entry, index) => (
                    <li key={index}>
                      <time>{entry.date}</time> · {entry.action}
                      <p>{entry.description}</p>
                    </li>
                  ))}
                </ol>
              </CatalogTab>
              {metadata && (
                <CatalogTab hidden={active !== 3}>{metadata}</CatalogTab>
              )}
            </div>
          }
        />
      )}
    </CatalogPanel>
  );
}
