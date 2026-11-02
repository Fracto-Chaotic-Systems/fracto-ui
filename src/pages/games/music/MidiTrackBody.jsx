import { memo } from "react";
import AppText from "../../../AppText.jsx";
import { MUSIC_TEXT } from "../../../text/GamesText.jsx";
import {
  visible_track_rows,
  TRACK_LABEL_WIDTH,
  TRACK_ROW_HEIGHT,
  TRACK_RULER_HEIGHT,
} from "./MidiTrackGeometry.js";
import MidiTrackCanvas from "./MidiTrackCanvas.jsx";
import MidiNoteHighlights from "./MidiNoteHighlights.jsx";
import { DEFAULT_MIDI_MIX, midi_mix_gain } from "./MidiMixer.js";
import MidiEventLane from "./MidiEventLane.jsx";
import {
  TrackViewport,
  TrackContent,
  TrackRuler,
  RulerCorner,
  TrackRow,
  TrackLabel,
  TrackCell,
} from "./MidiTrackStyles.jsx";
const text = (key) => AppText.get(MUSIC_TEXT[key]);

function MidiTrackBody({
  viewport_ref,
  viewport,
  geometry,
  on_scroll,
  rows,
  duration,
  selected,
  on_select,
  summary,
  position,
  running,
  mix,
}) {
  const { first, last } = visible_track_rows(
    viewport.top,
    viewport.height,
    rows.length,
  );
  const any_solo = Object.values(mix).some((setting) => setting.solo);
  const route_summary = (row) =>
    `${summary(row)}${mix[row.id]?.mute ? ` · ${text("muted")}` : ""}${mix[row.id]?.solo ? ` · ${text("solo")}` : ""}${any_solo && !mix[row.id]?.solo ? ` · ${text("solo_silenced")}` : ""}`;
  const width = Math.min(geometry.width, geometry.extent);
  const x = position * geometry.scale - viewport.left;
  return (
    <TrackViewport
      ref={viewport_ref}
      onScroll={on_scroll}
      role="region"
      aria-label={text("track_timeline")}
      tabIndex={0}
      style={{
        height: Math.min(
          416,
          TRACK_RULER_HEIGHT + rows.length * TRACK_ROW_HEIGHT + 18,
        ),
      }}
    >
      <TrackContent
        style={{
          width: TRACK_LABEL_WIDTH + geometry.extent,
          height: TRACK_RULER_HEIGHT + rows.length * TRACK_ROW_HEIGHT,
        }}
      >
        <TrackRuler>
          <RulerCorner>{text("track_channel")}</RulerCorner>
          <TrackCell>
            <MidiTrackCanvas
              ruler
              width={width}
              scale={geometry.scale}
              scroll={viewport.left}
              duration={duration}
            />
          </TrackCell>
        </TrackRuler>
        {rows.slice(first, last).map((row, offset) => (
          <TrackRow
            key={row.id}
            data-row-kind={row.kind}
            style={{
              top: TRACK_RULER_HEIGHT + (first + offset) * TRACK_ROW_HEIGHT,
            }}
          >
            {row.kind !== "notes" ? (
              <MidiEventLane
                lane={row}
                width={width}
                scale={geometry.scale}
                scroll={viewport.left}
                position={position}
              />
            ) : (
              <>
                <TrackLabel
                  aria-label={route_summary(row)}
                  title={route_summary(row)}
                  aria-pressed={selected === row.id}
                  onClick={() => on_select(row.id)}
                >
                  <strong>{row.name}</strong>
                  <small>
                    {text("channel_notes")
                      .replace("{channel}", String(row.channel + 1))
                      .replace("{count}", String(row.note_count))}
                    {mix[row.id]?.mute ? ` · ${text("muted")}` : ""}
                    {mix[row.id]?.solo ? ` · ${text("solo")}` : ""}
                    {any_solo && !mix[row.id]?.solo
                      ? ` · ${text("solo_silenced")}`
                      : ""}
                  </small>
                </TrackLabel>
                <TrackCell>
                  <div
                    style={{
                      position: "sticky",
                      left: TRACK_LABEL_WIDTH,
                      width,
                      height: TRACK_ROW_HEIGHT,
                      opacity:
                        midi_mix_gain(
                          mix[row.id] ?? DEFAULT_MIDI_MIX,
                          any_solo,
                        ) === 0
                          ? 0.35
                          : 1,
                    }}
                  >
                    <MidiTrackCanvas
                      stacked
                      row={row}
                      selected={selected === row.id}
                      width={width}
                      scale={geometry.scale}
                      scroll={viewport.left}
                      duration={duration}
                    />
                    <MidiNoteHighlights
                      row={row}
                      width={width}
                      scale={geometry.scale}
                      scroll={viewport.left}
                      position={position}
                      running={running}
                    />
                  </div>
                </TrackCell>
              </>
            )}
          </TrackRow>
        ))}
        <div
          data-playhead
          data-seconds={position}
          data-clock-running={running}
          role="img"
          aria-label={text("playhead")}
          style={{
            position: "absolute",
            left: viewport.left + TRACK_LABEL_WIDTH,
            top: viewport.top,
            width,
            height: viewport.height,
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 6,
          }}
        >
          {x >= 0 && x <= width && (
            <div
              style={{
                position: "absolute",
                left: Math.min(width - 2, x),
                top: 0,
                bottom: 0,
                width: 2,
                background: "#b32424",
              }}
            />
          )}
        </div>
      </TrackContent>
    </TrackViewport>
  );
}
export default memo(MidiTrackBody);
