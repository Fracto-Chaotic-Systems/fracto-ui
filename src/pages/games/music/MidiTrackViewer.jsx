import { memo, useEffect, useMemo, useState } from "react";
import AppText from "../../../AppText.jsx";
import { MUSIC_TEXT } from "../../../text/GamesText.jsx";
import { build_midi_display_model } from "./MidiDisplayModel.js";
import { index_track_notes, MAX_TRACK_ZOOM } from "./MidiTrackGeometry.js";
import {
  build_track_event_lanes,
  follow_track_scroll,
} from "./MidiTrackPlayback.js";
import useTrackViewport from "./useTrackViewport.js";
import useMidiTrackClock from "./useMidiTrackClock.js";
import MidiTrackMixer from "./MidiTrackMixer.jsx";
import MidiTrackBody from "./MidiTrackBody.jsx";
import { MusicButton } from "./MusicStyles.jsx";
import {
  TrackSection,
  TrackToolbar,
  TrackDetails,
} from "./MidiTrackStyles.jsx";

const text = (key, values = {}) => {
  let value = AppText.get(MUSIC_TEXT[key]);
  for (const [name, replacement] of Object.entries(values))
    value = value.replaceAll(`{${name}}`, String(replacement));
  return value;
};
function MidiTrackViewer({
  song,
  status,
  playback_id,
  get_snapshot,
  mix,
  set_mix,
  reset_mix,
  instruments,
  set_instrument,
}) {
  const model = useMemo(() => build_midi_display_model(song), [song]);
  const rows = useMemo(
    () => [
      ...build_track_event_lanes(song),
      ...model.rows.flatMap((track) =>
        track.routes.map((route) => ({
          ...route,
          kind: "notes",
          name: track.name || text("track_name", { number: track.index + 1 }),
          instrument_name: track.instrument_name,
          index: index_track_notes(route.notes),
        })),
      ),
    ],
    [model, song],
  );
  const [selected, set_selected] = useState(null);
  const [follow, set_follow] = useState(true);
  const {
    ref: viewport_ref,
    viewport,
    geometry,
    zoom,
    change_zoom,
    on_scroll,
    fit,
    scroll_to,
  } = useTrackViewport(song.duration_seconds);
  const { position, running } = useMidiTrackClock(
    status,
    playback_id,
    get_snapshot,
    song.duration_seconds,
  );
  useEffect(() => {
    if (!follow || !["playing", "completed", "stopped"].includes(status))
      return;
    const left = follow_track_scroll(
      position,
      geometry.scale,
      viewport.left,
      geometry.width,
      geometry.extent,
    );
    if (Math.abs(left - viewport.left) > 0.5) scroll_to(left);
  }, [
    follow,
    status,
    position,
    geometry.scale,
    geometry.width,
    geometry.extent,
    viewport.left,
    scroll_to,
  ]);
  const detail = rows.find((row) => row.id === selected);
  const summary = (row) =>
    text("track_summary", {
      name: row.name,
      channel: row.channel + 1,
      count: row.note_count,
      min: row.pitch_range.min,
      max: row.pitch_range.max,
    });
  return (
    <TrackSection aria-label={text("tracks")}>
      <h2>{text("tracks")}</h2>
      <p>
        {text("tracks_summary", {
          tracks: model.rows.length,
          routes: rows.filter((row) => row.kind === "notes").length,
        })}
      </p>
      <TrackToolbar>
        <label>
          {text("zoom")}
          <input
            type="range"
            aria-label={text("zoom")}
            min="0"
            max={MAX_TRACK_ZOOM}
            step="0.25"
            value={zoom}
            disabled={song.duration_seconds <= 0}
            onChange={(event) => change_zoom(Number(event.target.value))}
          />
        </label>
        <MusicButton onClick={fit}>{text("fit_tracks")}</MusicButton>
        <MusicButton onClick={reset_mix}>{text("reset_mix")}</MusicButton>
        <label>
          <input
            type="checkbox"
            checked={follow}
            onChange={(event) => set_follow(event.target.checked)}
          />
          {text("follow_playhead")}
        </label>
      </TrackToolbar>
      <p style={{ fontSize: "0.8rem" }}>
        <span style={{ color: "#075caa" }}>●</span> {text("held_keys")} ·{" "}
        <span style={{ color: "#bc6b00" }}>●</span> {text("sustained_keys")} ·{" "}
        {text("sustain_tail")}
      </p>
      <MidiTrackBody
        viewport_ref={viewport_ref}
        viewport={viewport}
        geometry={geometry}
        on_scroll={on_scroll}
        rows={rows}
        duration={song.duration_seconds}
        selected={selected}
        on_select={set_selected}
        summary={summary}
        position={position}
        running={running}
        mix={mix}
      />
      <TrackDetails role="status">
        {detail
          ? `${summary(detail)} · ${text("programs", { programs: detail.programs.map((p) => p + 1).join(", ") })}${detail.instrument_name ? ` · ${detail.instrument_name}` : ""}`
          : text("select_track")}
      </TrackDetails>
      <MidiTrackMixer
        row={detail}
        mix={mix}
        on_change={set_mix}
        instruments={instruments}
        set_instrument={set_instrument}
        program_changes={song.program_changes}
      />
      {model.conductor_tracks.length > 0 && (
        <details>
          <summary>
            {text("conductor_tracks", { count: model.conductor_tracks.length })}
          </summary>
          <ul>
            {model.conductor_tracks.map((track) => (
              <li key={track.id}>
                {track.name || text("track_name", { number: track.index + 1 })}
              </li>
            ))}
          </ul>
        </details>
      )}
    </TrackSection>
  );
}
export default memo(MidiTrackViewer);
