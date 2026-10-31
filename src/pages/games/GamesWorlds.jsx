import { useEffect, useState } from "react";
import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import AppSettings from "../../AppSettings.jsx";
import {
  KEY_GAMES_WORLD_MAPPING,
  KEY_GAMES_WORLD_NOTES,
  KEY_GAMES_WORLDS_DRAFT_VERSION,
} from "../../settings/GamesSettings.jsx";
import { KEY_GAMES_WORLDS_TITLE, WORLDS_TEXT } from "../../text/GamesText.jsx";
import { render_pattern_block } from "../study/StudyUtils.jsx";
import { WORLD_CONTENDERS } from "./WorldsContenders.js";
import {
  WORLD_DRAG_TYPE,
  WORLDS_PAGE_SIZE,
  place_world,
  prime_factorization,
  remove_world,
} from "./WorldsMapping.js";
import { prepare_worlds_draft } from "./WorldsDraft.js";
import WorldsNotes from "./WorldsNotes.jsx";
import WorldsCard from "./WorldsCard.jsx";
import {
  WorldsLayout,
  MappingPane,
  Toolbar,
  TableScroll,
  MappingTable,
  DropCell,
  EmptySlot,
  ContendersPane,
  ContenderList,
} from "./GamesWorldsStyles.jsx";

const by_id = Object.fromEntries(
  WORLD_CONTENDERS.map((item) => [item.id, item]),
);
const text = (key) => AppText.get(WORLDS_TEXT[key]);
const accepts_drag = (event) =>
  event.dataTransfer.types.includes(WORLD_DRAG_TYPE);

const GamesWorlds = () => {
  const [draft, set_draft] = useState(() =>
    prepare_worlds_draft(
      AppSettings.get(KEY_GAMES_WORLD_MAPPING),
      AppSettings.get(KEY_GAMES_WORLD_NOTES),
      AppSettings.get(KEY_GAMES_WORLDS_DRAFT_VERSION),
      WORLD_CONTENDERS,
    ),
  );
  const { mapping, notes } = draft;
  useEffect(() => {
    AppSettings.on_settings_changed({
      [KEY_GAMES_WORLD_MAPPING]: draft.mapping,
      [KEY_GAMES_WORLD_NOTES]: draft.notes,
      [KEY_GAMES_WORLDS_DRAFT_VERSION]: draft.version,
    });
  }, [draft]);
  const [assigned_only, set_assigned_only] = useState(true);
  const [selected, set_selected] = useState(null);
  const [query, set_query] = useState("");
  const [page, set_page] = useState(0);
  const [hovered, set_hovered] = useState(null);
  const first = page * WORLDS_PAGE_SIZE + 1;
  const rows = assigned_only
    ? Object.keys(mapping)
        .map(Number)
        .sort((a, b) => a - b)
    : Array.from({ length: WORLDS_PAGE_SIZE }, (_, index) => first + index);
  const assigned_rows = Object.fromEntries(
    Object.entries(mapping).map(([row, id]) => [id, row]),
  );
  const contenders = WORLD_CONTENDERS.filter((item) =>
    `${item.label} ${item.words.join(" ")} ${item.gloss}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const update_mapping = (next) => {
    set_draft((previous) => ({ ...previous, mapping: next }));
  };
  const assign = (row, id) => {
    if (!by_id[id]) return;
    update_mapping(place_world(mapping, row, id, WORLD_CONTENDERS));
    set_selected(null);
    set_hovered(null);
  };
  const card = (id, details = false) => (
    <WorldsCard
      contender={by_id[id]}
      selected={selected === id}
      on_select={(next) => set_selected(selected === next ? null : next)}
      assigned_row={assigned_rows[id]}
      details={details}
    />
  );

  return (
    <>
      <styles.SectionTitle>
        {AppText.get(KEY_GAMES_WORLDS_TITLE)}
      </styles.SectionTitle>
      <WorldsLayout>
        <MappingPane aria-label={text("association")}>
          <p>{text("help")}</p>
          <Toolbar>
            <label>
              <input
                type="checkbox"
                checked={assigned_only}
                onChange={(event) => set_assigned_only(event.target.checked)}
              />
              {text("assigned_only")}
            </label>
            {assigned_only ? (
              <span>
                {rows.length} {text("assigned_worlds")}
              </span>
            ) : (
              <>
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => set_page(page - 1)}
                >
                  {text("previous")}
                </button>
                <span>
                  {text("rows")} {first} - {first + WORLDS_PAGE_SIZE - 1}
                </span>
                <button type="button" onClick={() => set_page(page + 1)}>
                  {text("next")}
                </button>
              </>
            )}
            <span role="status">
              {text("selected")}: {by_id[selected]?.label ?? text("none")}
            </span>
            <button
              type="button"
              disabled={!assigned_rows[selected]}
              onClick={() => {
                update_mapping(remove_world(mapping, selected));
                set_selected(null);
              }}
            >
              {text("clear")}
            </button>
          </Toolbar>
          <TableScroll>
            <MappingTable>
              <thead>
                <tr>
                  <th scope="col">{text("cardinality")}</th>
                  <th scope="col">{text("factorization")}</th>
                  <th scope="col">{text("association")}</th>
                  <th scope="col">{text("notes")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const factors = prime_factorization(row);
                  return (
                    <tr key={row}>
                      <td>{render_pattern_block(row)}</td>
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
                        <DropCell
                          $active={hovered === row}
                          onDragOver={(event) => {
                            if (accepts_drag(event)) {
                              event.preventDefault();
                              event.dataTransfer.dropEffect = "move";
                              set_hovered(row);
                            }
                          }}
                          onDragLeave={(event) => {
                            if (
                              !event.currentTarget.contains(event.relatedTarget)
                            )
                              set_hovered(null);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            assign(
                              row,
                              event.dataTransfer.getData(WORLD_DRAG_TYPE),
                            );
                          }}
                        >
                          {mapping[row] ? (
                            <>
                              {card(mapping[row])}
                              {selected && selected !== mapping[row] && (
                                <EmptySlot
                                  type="button"
                                  onClick={() => assign(row, selected)}
                                >
                                  {text("assign")}
                                </EmptySlot>
                              )}
                            </>
                          ) : (
                            <EmptySlot
                              type="button"
                              disabled={!selected}
                              aria-label={`${text("assign")} ${row}`}
                              onClick={() => assign(row, selected)}
                            >
                              {text(selected ? "assign" : "drop")}
                            </EmptySlot>
                          )}
                        </DropCell>
                      </td>
                      <td>
                        <WorldsNotes
                          cardinality={row}
                          value={notes[row] ?? ""}
                          on_change={(value) =>
                            set_draft((previous) => {
                              const next_notes = { ...previous.notes };
                              if (value) next_notes[row] = value;
                              else delete next_notes[row];
                              return { ...previous, notes: next_notes };
                            })
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </MappingTable>
          </TableScroll>
        </MappingPane>
        <ContendersPane
          aria-label={text("contenders")}
          onDragOver={(event) => {
            if (accepts_drag(event)) event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            const id = event.dataTransfer.getData(WORLD_DRAG_TYPE);
            if (by_id[id]) {
              update_mapping(remove_world(mapping, id));
              set_selected(null);
              set_hovered(null);
            }
          }}
        >
          <h3>
            {text("contenders")} ({WORLD_CONTENDERS.length})
          </h3>
          <p>{text("scope")}</p>
          <p>{text("tray_help")}</p>
          <input
            type="search"
            aria-label={text("search")}
            placeholder={text("search")}
            value={query}
            onChange={(event) => set_query(event.target.value)}
          />
          <ContenderList>
            {contenders.length ? (
              contenders.map((item) => (
                <div key={item.id}>{card(item.id, true)}</div>
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
