import { memo } from "react";
import AppText from "../../../AppText.jsx";
import { MUSIC_TEXT } from "../../../text/GamesText.jsx";
import { DEFAULT_MIDI_MIX } from "./MidiMixer.js";
import { TrackMixToggles, TrackMixSliders } from "./MidiTrackStyles.jsx";
import { MidiFader } from "./MidiFader.jsx";

const text = (key) => AppText.get(MUSIC_TEXT[key]);

function MidiTrackMixControls({
  row,
  mix = DEFAULT_MIDI_MIX,
  on_select,
  set_mix,
}) {
  const pan = Math.round(mix.pan * 100);
  const pan_label =
    pan === 0
      ? text("pan_center")
      : `${Math.abs(pan)}% ${text(pan < 0 ? "pan_left" : "pan_right")}`;
  const update = (patch) => {
    on_select(row.id);
    set_mix(row.id, patch);
  };
  return (
    <>
      <TrackMixToggles>
        {["mute", "solo"].map((key) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={mix[key]}
              onChange={(event) => update({ [key]: event.target.checked })}
            />
            {text(key)}
          </label>
        ))}
      </TrackMixToggles>
      <TrackMixSliders>
        <label>
          <MidiFader
            $cap_letter={text("volume_cap")}
            aria-label={text("volume")}
            min="0"
            max="100"
            step="1"
            value={Math.round(mix.volume * 100)}
            aria-valuetext={`${Math.round(mix.volume * 100)}%`}
            onChange={(event) =>
              update({ volume: Number(event.target.value) / 100 })
            }
          />
        </label>
        <label>
          <MidiFader
            $cap_letter={text("pan_cap")}
            aria-label={text("pan")}
            min="-100"
            data-center-marker="true"
            data-centered={pan === 0}
            max="100"
            step="1"
            value={pan}
            aria-valuetext={pan_label}
            onChange={(event) =>
              update({ pan: Number(event.target.value) / 100 })
            }
          />
        </label>
      </TrackMixSliders>
    </>
  );
}

export default memo(MidiTrackMixControls);
