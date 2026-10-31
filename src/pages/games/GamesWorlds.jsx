import { useSearchParams } from "react-router-dom";
import { scroll_world_row, scroll_world_theme } from "./WorldsNavigation.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import AppSettings from "../../AppSettings.jsx";
import { KEY_GAMES_WORLD_NOTES } from "../../settings/GamesSettings.jsx";
import { DataBackend } from "../../backend/DataBackend.jsx";
import { index_world_mappings } from "./WorldsDatabase.js";
import { KEY_GAMES_WORLDS_TITLE, WORLDS_TEXT } from "../../text/GamesText.jsx";
import { render_pattern_block } from "../study/StudyUtils.jsx";
import { WORLD_CONTENDERS } from "./WorldsContenders.js";
import { prime_factorization } from "./WorldsMapping.js";
import { worlds_csv } from "./WorldsCsv.js";
import WorldsNotes from "./WorldsNotes.jsx";
import WorldsCard from "./WorldsCard.jsx";
import {
  WorldsLayout,
  MappingPane,
  Toolbar,
  TableScroll,
  MappingTable,
  ContendersPane,
  ContenderList,
} from "./GamesWorldsStyles.jsx";

const by_id = Object.fromEntries(
  WORLD_CONTENDERS.map((item) => [item.id, item]),
);
const text = (key) => AppText.get(WORLDS_TEXT[key]);

const GamesWorlds = () => {
  const table_scroll = useRef(null);
  const themes_scroll = useRef(null);
  const [params] = useSearchParams();
  const requested_card = params.get("card");
  const show_assignment = (cardinality) =>
    scroll_world_row(table_scroll.current, cardinality);
  const [data, set_data] = useState({
    mapping: {},
    associations: {},
    notes: {},
  });
  const [local_notes, set_local_notes] = useState(
    () => AppSettings.get(KEY_GAMES_WORLD_NOTES) || {},
  );
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState(false);
  const [attempt, set_attempt] = useState(0);
  const { mapping, associations } = data;
  const notes = { ...data.notes, ...local_notes };
  useEffect(() => {
    const controller = new AbortController();
    DataBackend.get_wordnet_mappings(controller.signal)
      .then((response) => {
        const next = index_world_mappings(response.result);
        if (!controller.signal.aborted) set_data(next);
      })
      .catch(() => {
        if (!controller.signal.aborted) set_error(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) set_loading(false);
      });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    if (requested_card && data.mapping[requested_card]) {
      scroll_world_row(table_scroll.current, requested_card);
      scroll_world_theme(themes_scroll.current, data.mapping[requested_card]);
    }
  }, [data, requested_card]);
  const csv_url = useMemo(
    () =>
      `data:text/csv;charset=utf-8,${encodeURIComponent(worlds_csv(data.associations, { ...data.notes, ...local_notes }))}`,
    [data, local_notes],
  );
  const update_note = (row, value) => {
    const next = { ...local_notes, [row]: value };
    set_local_notes(next);
    AppSettings.on_settings_changed({ [KEY_GAMES_WORLD_NOTES]: next });
  };
  const [query, set_query] = useState("");
  const rows = Object.keys(mapping)
    .map(Number)
    .sort((a, b) => a - b);
  const assigned_rows = Object.fromEntries(
    Object.entries(mapping).map(([row, id]) => [id, row]),
  );
  const contenders = WORLD_CONTENDERS.filter((item) =>
    `${item.label} ${item.words.join(" ")} ${item.gloss}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const card = (id, details = false) => (
    <WorldsCard
      contender={by_id[id]}
      assigned_row={assigned_rows[id]}
      details={details}
      on_show_assignment={show_assignment}
    />
  );

  return (
    <>
      <styles.SectionTitle>
        {AppText.get(KEY_GAMES_WORLDS_TITLE)}
      </styles.SectionTitle>
      <WorldsLayout>
        <MappingPane aria-label={text("association")}>
          {loading && <p role="status">{text("loading")}</p>}
          {error && (
            <p role="alert">
              {text("error")}{" "}
              <button
                type="button"
                onClick={() => {
                  set_error(false);
                  set_loading(true);
                  set_attempt((value) => value + 1);
                }}
              >
                {text("retry")}
              </button>
            </p>
          )}
          <Toolbar>
            {!loading && !error && (
              <a href={csv_url} download="wordnet-mappings.csv">
                <em>{text("download_csv")}</em>
              </a>
            )}
          </Toolbar>
          <TableScroll ref={table_scroll}>
            <MappingTable>
              <thead>
                <tr>
                  <th scope="col">{text("cardinality")}</th>
                  <th scope="col">{text("factorization")}</th>
                  <th scope="col">{text("association")}</th>
                  <th scope="col">{text("name")}</th>
                  <th scope="col">{text("notes")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const factors = prime_factorization(row);
                  return (
                    <tr key={row} data-cardinality={row}>
                      <td>{render_pattern_block(row, 25)}</td>
                      <td>
                        {factors.length
                          ? factors.map(({ prime, exponent }, index) => (
                              <span key={prime}>
                                {index > 0 ? " \u00d7 " : ""}
                                {prime}
                                {exponent > 1 && <sup>{exponent}</sup>}
                              </span>
                            ))
                          : "1"}
                      </td>
                      <td>
                        {mapping[row] ? (
                          <WorldsCard contender={associations[row]} />
                        ) : (
                          text("unassigned")
                        )}
                      </td>
                      <td>{associations[row]?.world_name ?? ""}</td>
                      <td>
                        <WorldsNotes
                          cardinality={row}
                          value={notes[row] ?? ""}
                          on_change={(value) => update_note(row, value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </MappingTable>
          </TableScroll>
        </MappingPane>
        <ContendersPane aria-label={text("contenders")}>
          <h3>
            {text("contenders")} ({WORLD_CONTENDERS.length})
          </h3>
          <input
            type="search"
            aria-label={text("search")}
            placeholder={text("search")}
            value={query}
            onChange={(event) => set_query(event.target.value)}
          />
          <ContenderList ref={themes_scroll}>
            {contenders.length ? (
              contenders.map((item) => (
                <div key={item.id} data-synset-id={item.id}>
                  {card(item.id, true)}
                </div>
              ))
            ) : (
              <p>{text("empty")}</p>
            )}
          </ContenderList>
        </ContendersPane>
      </WorldsLayout>
    </>
  );
};
export default GamesWorlds;
