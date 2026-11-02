import { memo } from "react";
import styled from "styled-components";
import AppText from "../../../AppText.jsx";
import { MUSIC_TEXT } from "../../../text/GamesText.jsx";
import MidiInstrumentAssignment from "./MidiInstrumentAssignment.jsx";
import { DEFAULT_MIDI_MIX } from "./MidiMixer.js";

const MixPanel = styled.fieldset`
  margin: 0.75rem 0;
  padding: 1rem;
  border: 1px solid #bac4cd;
  legend {
    font-size: 0.85rem;
    font-weight: bold;
  }
  .mix-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 1.5rem;
    align-items: center;
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
  }
  input[type="range"] {
    width: 8rem;
  }
  output {
    font-family: monospace;
    min-width: 3rem;
  }
  p {
    font-size: 0.75rem;
    margin: 0.8rem 0 0;
  }
`;
const text = (key) => AppText.get(MUSIC_TEXT[key]);
function MidiTrackMixer({
  row,
  mix,
  on_change,
  instruments,
  set_instrument,
  catalog,
  program_changes,
}) {
  if (!row) return <p style={{ fontSize: "0.8rem" }}>{text("select_mix")}</p>;
  const setting = mix[row.id] ?? DEFAULT_MIDI_MIX;
  const pan = Math.round(setting.pan * 100);
  return (
    <MixPanel data-mixer-route={row.id}>
      <legend>
        {row.name} ·{" "}
        {text("mix_channel").replace("{channel}", String(row.channel + 1))}
      </legend>
      <div className="mix-controls">
        <label>
          <input
            type="checkbox"
            checked={setting.mute}
            onChange={(event) =>
              on_change(row.id, { mute: event.target.checked })
            }
          />
          {text("mute")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={setting.solo}
            onChange={(event) =>
              on_change(row.id, { solo: event.target.checked })
            }
          />
          {text("solo")}
        </label>
        <label>
          {text("volume")}
          <input
            type="range"
            aria-label={text("volume")}
            aria-valuetext={`${Math.round(setting.volume * 100)}%`}
            min="0"
            max="100"
            step="1"
            value={Math.round(setting.volume * 100)}
            onChange={(event) =>
              on_change(row.id, { volume: Number(event.target.value) / 100 })
            }
          />
          <output>{Math.round(setting.volume * 100)}%</output>
        </label>
        <label>
          {text("pan")}
          <input
            type="range"
            aria-label={text("pan")}
            aria-valuetext={
              pan === 0
                ? text("pan_center")
                : `${Math.abs(pan)}% ${text(pan < 0 ? "pan_left" : "pan_right")}`
            }
            min="-100"
            max="100"
            step="1"
            value={pan}
            onChange={(event) =>
              on_change(row.id, { pan: Number(event.target.value) / 100 })
            }
          />
          <output>
            {pan === 0
              ? text("pan_center")
              : `${Math.abs(pan)}% ${text(pan < 0 ? "pan_left" : "pan_right")}`}
          </output>
        </label>
      </div>
      <p>{text("mix_help")}</p>
      <MidiInstrumentAssignment
        key={row.id}
        row={row}
        catalog={catalog}
        assignments={instruments}
        on_change={set_instrument}
        program_changes={program_changes}
      />
    </MixPanel>
  );
}
export default memo(MidiTrackMixer);
