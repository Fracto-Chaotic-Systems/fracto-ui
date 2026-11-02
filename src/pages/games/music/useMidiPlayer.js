import { useEffect, useRef, useState } from "react";
import MidiPlaybackController from "./MidiPlaybackController.js";
import { MAX_MIDI_BYTES } from "./MidiValidation.js";

const initial = {
  snapshot: {
    status: "idle",
    error: null,
    warnings: [],
    position_seconds: 0,
    duration_seconds: 0,
  },
  file_name: "",
  reading: false,
  loaded: false,
  import_error: null,
};

export default function useMidiPlayer() {
  const controller = useRef(null);
  const generation = useRef(0);
  const [state, set_state] = useState(initial);
  useEffect(() => {
    let active = true;
    const player = new MidiPlaybackController({
      on_status: (snapshot) => {
        if (active) set_state((previous) => ({ ...previous, snapshot }));
      },
    });
    controller.current = player;
    return () => {
      active = false;
      controller.current = null;
      void player.dispose();
    };
  }, []);
  useEffect(() => {
    if (state.snapshot.status !== "playing") return;
    const timer = setInterval(() => {
      const snapshot = controller.current?.snapshot();
      if (snapshot) set_state((previous) => ({ ...previous, snapshot }));
    }, 200);
    return () => clearInterval(timer);
  }, [state.snapshot.status]);

  const open_file = async (file) => {
    const player = controller.current;
    if (!file || !player) return;
    const request = ++generation.current;
    player.unload();
    set_state((previous) => ({
      ...previous,
      reading: true,
      loaded: false,
      file_name: "",
      import_error: null,
    }));
    let error_code = "file_read_failed";
    try {
      if (file.size > MAX_MIDI_BYTES) {
        error_code = "file_too_large";
        throw new Error(error_code);
      }
      const bytes = await file.arrayBuffer();
      if (request !== generation.current || player.disposed) return;
      error_code = "invalid_midi_file";
      player.load(bytes);
      set_state((previous) => ({
        ...previous,
        reading: false,
        loaded: true,
        file_name: file.name,
      }));
    } catch {
      if (request !== generation.current || player.disposed) return;
      set_state((previous) => ({
        ...previous,
        reading: false,
        loaded: false,
        import_error: error_code,
      }));
    }
  };
  const stop = () => {
    generation.current++;
    controller.current?.stop();
    set_state((previous) => ({
      ...previous,
      reading: false,
      import_error: null,
    }));
  };
  return {
    ...state,
    open_file,
    stop,
    play: () => {
      void controller.current?.play();
    },
  };
}
