import { memo, useEffect, useMemo, useRef, useState } from "react";
import AppText from "../../../AppText.jsx";
import { MUSIC_TEXT } from "../../../text/GamesText.jsx";
import {
  DEFAULT_INSTRUMENT,
  INSTRUMENT_REGISTRY,
  ORIGINAL_INSTRUMENT,
} from "@fracto/sdk/music/MidiInstruments.js";
import {
  effective_instrument,
  instrument_choices,
  instrument_label,
} from "@fracto/sdk/music/MidiInstrumentChoices.js";
import {
  TrackLabel,
  TrackInstrumentSelect,
  TrackInstrumentButton,
  TrackLabelHeader,
  TrackChannelNumber,
} from "./MidiTrackStyles.jsx";
import { DEFAULT_MIDI_MIX } from "./MidiMixer.js";
import MidiTrackMixControls from "./MidiTrackMixControls.jsx";

const text = (key) => AppText.get(MUSIC_TEXT[key]);

function MidiTrackInstrumentLabel({
  row,
  selected,
  on_select,
  summary,
  catalog,
  selection = DEFAULT_INSTRUMENT,
  set_instrument,
  mix = DEFAULT_MIDI_MIX,
  set_mix,
}) {
  const [editing, set_editing] = useState(false);
  const control = useRef(null);
  const restore_focus = useRef(false);
  const registry = catalog?.registry ?? INSTRUMENT_REGISTRY;
  const name = useMemo(
    () => effective_instrument(row.notes, selection, registry, text),
    [row.notes, selection, registry],
  );
  const choices = useMemo(
    () =>
      editing
        ? instrument_choices(row.notes, registry, catalog?.catalog, selection)
        : [],
    [editing, row.notes, registry, catalog?.catalog, selection],
  );
  useEffect(() => {
    if (editing || restore_focus.current) control.current?.focus();
    restore_focus.current = false;
  }, [editing]);

  return (
    <TrackLabel as="div" data-selected={selected}>
      <TrackLabelHeader>
        <TrackChannelNumber
          aria-label={text("channel_number").replace(
            "{channel}",
            String(row.channel + 1),
          )}
        >
          {row.channel + 1}
        </TrackChannelNumber>
        {editing ? (
          <TrackInstrumentSelect
            ref={control}
            aria-label={text(
              row.channel === 9 ? "kit_assignment" : "instrument_assignment",
            )}
            value={selection}
            onChange={(event) => {
              set_instrument(row.id, event.target.value);
              restore_focus.current = true;
              set_editing(false);
            }}
            onBlur={() => set_editing(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                restore_focus.current = true;
                set_editing(false);
              }
            }}
          >
            <option
              value={ORIGINAL_INSTRUMENT}
              disabled={!registry.can_assign(row.notes, ORIGINAL_INSTRUMENT)}
            >
              {text("instrument_original")}
            </option>
            {choices.map((choice) => (
              <option
                key={choice.id}
                value={choice.id}
                disabled={!!choice.reason}
              >
                {instrument_label(choice, text)}
                {choice.reason ? ` · ${text(choice.reason)}` : ""}
              </option>
            ))}
          </TrackInstrumentSelect>
        ) : (
          <TrackInstrumentButton
            ref={control}
            type="button"
            aria-label={`${name} · ${summary}`}
            title={`${name} · ${summary}`}
            aria-pressed={selected}
            aria-haspopup="listbox"
            onClick={() => {
              on_select(row.id);
              set_editing(true);
            }}
          >
            <strong>{name}</strong>
          </TrackInstrumentButton>
        )}
      </TrackLabelHeader>
      <MidiTrackMixControls
        row={row}
        mix={mix}
        on_select={on_select}
        set_mix={set_mix}
      />
    </TrackLabel>
  );
}

export default memo(MidiTrackInstrumentLabel);
