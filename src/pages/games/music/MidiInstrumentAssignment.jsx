import { memo, useMemo } from "react";
import AppText from "../../../AppText.jsx";
import { MUSIC_TEXT } from "../../../text/GamesText.jsx";
import {
  INSTRUMENT_REGISTRY,
  DEFAULT_INSTRUMENT,
  ORIGINAL_INSTRUMENT,
} from "./MidiInstruments.js";
import { timeline_time } from "./MidiTrackGeometry.js";

const text = (key, values = {}) => {
  let result = AppText.get(MUSIC_TEXT[key]);
  for (const [name, value] of Object.entries(values))
    result = result.replaceAll(`{${name}}`, String(value));
  return result;
};
function MidiInstrumentAssignment({
  row,
  assignments,
  on_change,
  program_changes,
}) {
  const selection = assignments[row.id] ?? DEFAULT_INSTRUMENT;
  const original_available = useMemo(
    () => INSTRUMENT_REGISTRY.can_assign(row.notes, ORIGINAL_INSTRUMENT),
    [row.notes],
  );
  const choices = useMemo(
    () =>
      Object.values(INSTRUMENT_REGISTRY.providers).map((provider) => ({
        provider,
        available: INSTRUMENT_REGISTRY.can_assign(row.notes, provider.id),
      })),
    [row.notes],
  );
  const effective = useMemo(() => {
    if (!INSTRUMENT_REGISTRY.can_assign(row.notes, selection))
      return text("instrument_not_playable");
    const ids = [
      ...new Set(
        row.notes.map(
          (note) => INSTRUMENT_REGISTRY.resolve(note, selection).instrument_id,
        ),
      ),
    ];
    return ids
      .map((id) => text(INSTRUMENT_REGISTRY.providers[id].label_key))
      .join(", ");
  }, [row.notes, selection]);
  const history = useMemo(
    () => program_changes.filter((event) => event.channel === row.channel),
    [program_changes, row.channel],
  );
  const banks = useMemo(
    () =>
      [
        ...new Set(
          row.notes.map(
            (note) => `${note.bank_msb ?? 0}:${note.bank_lsb ?? 0}`,
          ),
        ),
      ].join(", "),
    [row.notes],
  );
  return (
    <div style={{ marginTop: "1rem" }}>
      <label>
        {text("instrument_assignment")}
        <select
          value={selection}
          onChange={(event) => on_change(row.id, event.target.value)}
        >
          <option value={ORIGINAL_INSTRUMENT} disabled={!original_available}>
            {text(
              original_available
                ? "instrument_original"
                : "instrument_original_unavailable",
            )}
          </option>
          {choices.map(({ provider, available }) => (
            <option key={provider.id} value={provider.id} disabled={!available}>
              {text(provider.label_key)}
            </option>
          ))}
        </select>
      </label>
      <p>
        {text("instrument_file_programs", {
          programs: row.programs.map((program) => program + 1).join(", "),
          banks,
        })}
        {row.instrument_name
          ? ` · ${text("instrument_file_name", { name: row.instrument_name })}`
          : ""}
      </p>
      <p>{text("instrument_effective", { name: effective })}</p>
      {!original_available && <p>{text("instrument_original_help")}</p>}
      <p>{text("instrument_change_help")}</p>
      <details style={{ marginTop: "0.6rem" }}>
        <summary>
          {text("instrument_program_history", { count: history.length })}
        </summary>
        {history.length ? (
          <>
            <ol>
              {history.slice(0, 50).map((event) => (
                <li key={event.id}>
                  {text("instrument_program_event", {
                    program: event.program + 1,
                    time: timeline_time(event.seconds, 0.1),
                    track: event.track + 1,
                    bank: `${event.bank_msb ?? 0}:${event.bank_lsb ?? 0}`,
                  })}
                </li>
              ))}
            </ol>
            {history.length > 50 && (
              <p>
                {text("instrument_history_limit", { count: history.length })}
              </p>
            )}
          </>
        ) : (
          <p>{text("instrument_default_program")}</p>
        )}
      </details>
    </div>
  );
}
export default memo(MidiInstrumentAssignment);
