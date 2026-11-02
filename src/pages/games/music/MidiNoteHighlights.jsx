import { memo, useEffect, useMemo, useRef } from "react";
import { active_track_notes } from "./MidiTrackPlayback.js";
import { note_rectangle, TRACK_ROW_HEIGHT } from "./MidiTrackGeometry.js";

function MidiNoteHighlights({ row, width, scale, scroll, position, running }) {
  const ref = useRef(null);
  const active = useMemo(
    () => active_track_notes(row.index, position, running),
    [row.index, position, running],
  );
  useEffect(() => {
    const canvas = ref.current;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixel_width = Math.ceil(width * ratio);
    const pixel_height = TRACK_ROW_HEIGHT * ratio;
    if (canvas.width !== pixel_width || canvas.height !== pixel_height) {
      canvas.width = pixel_width;
      canvas.height = pixel_height;
    }
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    for (const [kind, notes] of Object.entries(active)) {
      context.fillStyle = kind === "held" ? "#075caa" : "#bc6b00";
      context.strokeStyle = kind === "held" ? "#073767" : "#7d4800";
      for (const note of notes) {
        const rect = note_rectangle(
          note,
          scale,
          scroll,
          width,
          row.pitch_range,
        );
        if (!rect.width) continue;
        context.fillRect(rect.x, rect.y, rect.width, rect.height);
        context.strokeRect(rect.x, rect.y, rect.width, rect.height);
      }
    }
  }, [active, width, scale, scroll, row.pitch_range]);
  return (
    <canvas
      ref={ref}
      data-held-count={active.held.length}
      data-sustained-count={active.sustained.length}
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height: TRACK_ROW_HEIGHT,
        pointerEvents: "none",
      }}
    />
  );
}
export default memo(MidiNoteHighlights);
