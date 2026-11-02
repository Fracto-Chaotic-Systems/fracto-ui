export const TRACK_LABEL_WIDTH = 192;
export const TRACK_ROW_HEIGHT = 72;
export const TRACK_RULER_HEIGHT = 32;
export const MAX_TRACK_ZOOM = 8;

export function timeline_geometry(duration, viewport_width, zoom = 0) {
  const width = Math.max(1, viewport_width - TRACK_LABEL_WIDTH);
  const scale =
    (width / Math.max(duration, 0.01)) *
    2 ** Math.max(0, Math.min(MAX_TRACK_ZOOM, zoom));
  return { width, scale, extent: Math.max(width, Math.ceil(duration * scale)) };
}

export function zoom_scroll(scroll, old_scale, new_scale, width, extent) {
  const center = (scroll + width / 2) / old_scale;
  return Math.max(0, Math.min(extent - width, center * new_scale - width / 2));
}

export function ruler_ticks(scroll, width, scale, duration) {
  const target = 90 / scale;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const interval = [1, 2, 5, 10]
    .map((n) => n * magnitude)
    .find((n) => n >= target);
  const ticks = [];
  const first = Math.max(0, Math.ceil(scroll / scale / interval));
  for (let i = first; i < first + 100; i++) {
    const seconds = i * interval;
    const x = seconds * scale - scroll;
    if (seconds > duration + 1e-9 || x > width) break;
    ticks.push({ seconds, x, label: timeline_time(seconds, interval) });
  }
  return ticks;
}

export function timeline_time(seconds, interval = 1) {
  const decimals = Math.max(0, Math.min(3, Math.ceil(-Math.log10(interval))));
  const unit = 10 ** decimals;
  const rounded = Math.round(seconds * unit);
  const minutes = Math.floor(rounded / (60 * unit));
  const remainder = ((rounded % (60 * unit)) / unit).toFixed(decimals);
  return `${minutes}:${remainder.padStart(decimals ? 3 + decimals : 2, "0")}`;
}

// Balanced interval index: a long sustained note does not force a scan of
// every earlier note when the viewer is scrolled late into the song.
export function index_track_notes(notes) {
  const build = (lo, hi) => {
    if (lo >= hi) return null;
    const mid = (lo + hi) >>> 1;
    const left = build(lo, mid),
      right = build(mid + 1, hi);
    return {
      note: notes[mid],
      left,
      right,
      end: Math.max(
        notes[mid].end_seconds,
        left?.end ?? -Infinity,
        right?.end ?? -Infinity,
      ),
    };
  };
  return build(0, notes.length);
}

export function visible_track_notes(index, start, end) {
  const notes = [];
  const visit = (node) => {
    if (!node || node.end < start) return;
    visit(node.left);
    if (node.note.start_seconds > end) return;
    if (node.note.end_seconds >= start) notes.push(node.note);
    visit(node.right);
  };
  visit(index);
  return notes;
}

export function visible_track_rows(scroll_top, height, count) {
  const first = Math.max(
    0,
    Math.floor((scroll_top - TRACK_RULER_HEIGHT) / TRACK_ROW_HEIGHT) - 1,
  );
  return {
    first,
    last: Math.min(count, first + Math.ceil(height / TRACK_ROW_HEIGHT) + 3),
  };
}

export function note_rectangle(note, scale, scroll, width, range) {
  const start = note.start_seconds * scale - scroll;
  const end = note.end_seconds * scale - scroll;
  const fraction =
    range.max === range.min
      ? 0.5
      : (range.max - note.pitch) / (range.max - range.min);
  return {
    x: Math.max(0, start),
    width: Math.max(
      0,
      Math.min(width, Math.max(start + 2, end)) - Math.max(0, start),
    ),
    y: 8 + Math.round(fraction * 7) * 7,
    height: 6,
  };
}
