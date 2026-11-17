import { memo, useMemo } from "react";
import AppText from "../../../AppText.jsx";
import { MUSIC_TEXT } from "../../../text/GamesText.jsx";
import {
  track_row_layout,
  visible_track_layout,
  TRACK_LABEL_WIDTH,
  TRACK_ROW_HEIGHT,
  TRACK_RULER_HEIGHT,
} from "./MidiTrackGeometry.js";
import MidiTrackCanvas from "./MidiTrackCanvas.jsx";
import MidiNoteHighlights from "./MidiNoteHighlights.jsx";
import { DEFAULT_MIDI_MIX, midi_mix_gain } from "./MidiMixer.js";
import MidiEventLane from "./MidiEventLane.jsx";
import MidiTrackInstrumentLabel from "./MidiTrackInstrumentLabel.jsx";
import {
  TrackViewport,
  TrackContent,
  TrackRuler,
  RulerCorner,
  TrackRow,
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
  catalog,
  instruments,
  set_instrument,
  set_mix,
}) {
  const layout = useMemo(() => track_row_layout(rows), [rows]);
  const visible = visible_track_layout(
    layout.rows,
    viewport.top,
    viewport.height,
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
        height: Math.min(416, layout.height + 18),
      }}
    >
      <TrackContent
        style={{
          width: TRACK_LABEL_WIDTH + geometry.extent,
          height: layout.height,
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
        {visible.map(({ row, top, height, channel_end }) => (
          <TrackRow
            key={row.id}
            data-row-kind={row.kind}
            data-strong-divider={
              channel_end || row.kind === "tempo" || row.kind === "meter"
            }
            style={{
              top,
              height,
            }}
          >
            {row.kind !== "notes" ? (
              <MidiEventLane
                lane={row}
                width={width}
                scale={geometry.scale}
                scroll={viewport.left}
                position={position}
                height={height}
              />
            ) : (
              <>
                <MidiTrackInstrumentLabel
                  row={row}
                  summary={route_summary(row)}
                  selected={selected === row.id}
                  on_select={on_select}
                  catalog={catalog}
                  selection={instruments[row.id]}
                  set_instrument={set_instrument}
                  mix={mix[row.id]}
                  set_mix={set_mix}
                />
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
