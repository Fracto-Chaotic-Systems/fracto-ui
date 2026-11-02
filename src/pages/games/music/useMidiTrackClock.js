import { useEffect, useState } from "react";
import { start_track_clock } from "./MidiTrackPlayback.js";

export default function useMidiTrackClock(status, playback_id, read, duration) {
  const [frame, set_frame] = useState(null);
  useEffect(() => {
    if (status !== "playing") return;
    return start_track_clock(read, set_frame);
  }, [status, playback_id, read]);
  const current = status === "playing" && frame?.playback_id === playback_id;
  return {
    position:
      status === "completed" ? duration : current ? frame.position_seconds : 0,
    running: !!(current && frame.clock_started),
  };
}
