import { index_track_notes, visible_track_notes } from "./MidiTrackGeometry.js";

export function active_track_notes(index, seconds, running) {
  const held = [],
    sustained = [];
  if (running)
    for (const note of visible_track_notes(index, seconds, seconds)) {
      if (seconds < note.start_seconds || seconds >= note.end_seconds) continue;
      (seconds < (note.key_release_seconds ?? note.end_seconds)
        ? held
        : sustained
      ).push(note);
    }
  return { held, sustained };
}

export function follow_track_scroll(position, scale, left, width, extent) {
  const cursor = position * scale;
  if (cursor >= left + width * 0.1 && cursor <= left + width * 0.8) return left;
  return Math.max(0, Math.min(extent - width, cursor - width * 0.25));
}

export function event_at_time(events, seconds) {
  let lo = 0,
    hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (events[mid].seconds <= seconds) lo = mid + 1;
    else hi = mid;
  }
  return lo ? events[lo - 1] : null;
}

export function build_track_event_lanes(song) {
  const segments = (events) =>
    events.map((event, index) => ({
      ...event,
      start_seconds: event.seconds,
      end_seconds: events[index + 1]?.seconds ?? song.duration_seconds,
    }));
  const lanes = [
    {
      id: "lane:tempo",
      kind: "tempo",
      events: song.tempos,
      segments: segments(song.tempos),
    },
    {
      id: "lane:meter",
      kind: "meter",
      events: song.time_signatures,
      segments: segments(song.time_signatures),
    },
  ];
  const channels = new Map();
  for (const event of song.pedal_events) {
    if (!channels.has(event.channel)) channels.set(event.channel, []);
    channels.get(event.channel).push(event);
  }
  for (const [channel, events] of [...channels].sort((a, b) => a[0] - b[0])) {
    const spans = [];
    let down = null;
    for (const event of events) {
      if (event.down && !down) down = event;
      else if (!event.down && down) {
        spans.push({
          ...down,
          start_seconds: down.seconds,
          end_seconds: event.seconds,
        });
        down = null;
      }
    }
    if (down)
      spans.push({
        ...down,
        start_seconds: down.seconds,
        end_seconds: song.duration_seconds,
      });
    lanes.push({
      id: `lane:pedal:${channel}`,
      kind: "pedal",
      channel,
      events,
      segments: spans,
    });
  }
  if (!channels.size)
    lanes.push({
      id: "lane:pedal:empty",
      kind: "pedal",
      channel: null,
      events: [],
      segments: [],
    });
  return lanes.map((lane) => ({
    ...lane,
    index: index_track_notes(lane.segments),
  }));
}

// The animation timestamp only throttles painting. Position always comes from
// the audio controller, including its lead-in, replay origin and suspension.
export function start_track_clock(
  read,
  publish,
  {
    request_frame = (callback) => requestAnimationFrame(callback),
    cancel_frame = (id) => cancelAnimationFrame(id),
  } = {},
) {
  let alive = true,
    frame = null,
    last = -Infinity;
  const tick = (timestamp) => {
    if (!alive) return;
    const snapshot = read();
    if (!snapshot || snapshot.status !== "playing") return;
    if (timestamp - last >= 1000 / 30) {
      last = timestamp;
      publish(snapshot);
    }
    if (alive) frame = request_frame(tick);
  };
  frame = request_frame(tick);
  return () => {
    alive = false;
    if (frame !== null) cancel_frame(frame);
  };
}
