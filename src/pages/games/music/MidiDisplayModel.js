import { freeze_midi_song } from "./MidiMetadata.js";

const summarize = (notes) => {
  let min = Infinity,
    max = -Infinity;
  const programs = new Set();
  for (const note of notes) {
    min = Math.min(min, note.pitch);
    max = Math.max(max, note.pitch);
    programs.add(note.program);
  }
  return {
    note_count: notes.length,
    pitch_range: notes.length ? { min, max } : null,
    programs: [...programs].sort((a, b) => a - b),
  };
};

// A track is a file container; a route is a (track, channel) pair. Channel
// controller state still spans tracks in MidiTimeline, never in this helper.
export function build_midi_display_model(song) {
  const groups = new Map(song.tracks.map((track) => [track.index, new Map()]));
  for (const note of song.notes) {
    const channels = groups.get(note.track);
    if (!channels.has(note.channel)) channels.set(note.channel, []);
    channels.get(note.channel).push(note);
  }
  const tracks = song.tracks.map((track) => {
    const groups_for_track = groups.get(track.index);
    const channels = [...groups_for_track.keys()].sort((a, b) => a - b);
    const routes = channels.map((channel) => {
      const notes = groups_for_track.get(channel);
      return {
        id: `track:${track.index}:channel:${channel}`,
        track: track.index,
        channel,
        notes,
        ...summarize(notes),
      };
    });
    const notes = routes.flatMap((route) => route.notes);
    return {
      ...track,
      id: `track:${track.index}`,
      channels,
      routes,
      ...summarize(notes),
      metadata_only: notes.length === 0,
    };
  });
  return freeze_midi_song({
    tracks,
    rows: tracks.filter((track) => !track.metadata_only),
    conductor_tracks: tracks.filter((track) => track.metadata_only),
    duration_seconds: song.duration_seconds,
    ppq: song.ppq,
    tempos: song.tempos,
    time_signatures: song.time_signatures,
    pedal_events: song.pedal_events,
    program_changes: song.program_changes,
    controller_events: song.controller_events,
    instrument_names: song.instrument_names,
    track_names: song.track_names,
  });
}
