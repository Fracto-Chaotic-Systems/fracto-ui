import { memo, useEffect, useRef } from "react";
import {
  visible_track_notes,
  note_rectangle,
  ruler_ticks,
  TRACK_ROW_HEIGHT,
  TRACK_RULER_HEIGHT,
} from "./MidiTrackGeometry.js";

function MidiTrackCanvas({
  width,
  scale,
  scroll,
  duration,
  row,
  ruler = false,
  selected = false,
  stacked = false,
}) {
  const ref = useRef(null);
  const height = ruler ? TRACK_RULER_HEIGHT : TRACK_ROW_HEIGHT;
  useEffect(() => {
    const canvas = ref.current;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.ceil(width * ratio);
    canvas.height = height * ratio;
    const context = canvas.getContext("2d");
    context.scale(ratio, ratio);
    context.fillStyle = ruler ? "#eef1f4" : selected ? "#f0f6fc" : "#ffffff";
    context.fillRect(0, 0, width, height);
    const ticks = ruler_ticks(scroll, width, scale, duration);
    context.font = "11px monospace";
    for (const tick of ticks) {
      context.fillStyle = ruler ? "#697986" : "#e8edf1";
      context.fillRect(tick.x, 0, 1, height);
      if (ruler) {
        context.fillStyle = "#344350";
        context.fillText(tick.label, tick.x + 4, 20);
      }
    }
    if (!ruler) {
      const notes = visible_track_notes(
        row.index,
        scroll / scale,
        (scroll + width) / scale,
      );
      if (notes.length < 2500) {
        for (const note of notes) {
          const rect = note_rectangle(
            note,
            scale,
            scroll,
            width,
            row.pitch_range,
          );
          context.fillStyle = `hsl(${(note.pitch * 17) % 360} 45% 48%)`;
          const release = note.key_release_seconds ?? note.end_seconds;
          context.globalAlpha = release < note.end_seconds ? 0.3 : 1;
          context.fillRect(rect.x, rect.y, rect.width, rect.height);
          context.globalAlpha = 1;
          if (release < note.end_seconds) {
            const held = note_rectangle(
              { ...note, end_seconds: release },
              scale,
              scroll,
              width,
              row.pitch_range,
            );
            context.fillRect(held.x, held.y, held.width, held.height);
          }
        }
      } else {
        // Dense passages become a bounded pixel occupancy image, not thousands
        // of canvas operations or DOM nodes. All note data remains accessible.
        const columns = Math.ceil(width);
        const lanes = Array.from(
          { length: 8 },
          () => new Int32Array(columns + 2),
        );
        for (const note of notes) {
          const rect = note_rectangle(
            note,
            scale,
            scroll,
            width,
            row.pitch_range,
          );
          const lane = Math.round((rect.y - 8) / 7);
          lanes[lane][Math.floor(rect.x)]++;
          lanes[lane][Math.min(columns, Math.ceil(rect.x + rect.width))]--;
        }
        context.fillStyle = "#4e7fa4";
        lanes.forEach((lane, y) => {
          let count = 0,
            start = -1;
          for (let x = 0; x <= columns; x++) {
            count += lane[x];
            if (count > 0 && start < 0) start = x;
            if ((count === 0 || x === columns) && start >= 0) {
              context.fillRect(start, 8 + y * 7, x - start, 6);
              start = -1;
            }
          }
        });
      }
    }
    context.fillStyle = "#dce1e5";
    context.fillRect(0, height - 1, width, 1);
  }, [width, height, scale, scroll, duration, row, ruler, selected]);
  return (
    <canvas
      ref={ref}
      style={{
        width,
        height,
        ...(stacked ? { position: "absolute", left: 0, top: 0 } : {}),
      }}
      aria-hidden="true"
    />
  );
}
export default memo(MidiTrackCanvas);
