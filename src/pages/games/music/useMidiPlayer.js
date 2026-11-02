import { service_origin } from "../../../utils/service_origin.jsx";
import { load_instrument_catalog } from "./MidiInstrumentCatalog.js";
import { useCallback, useEffect, useRef, useState } from "react";
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
  song: null,
  mix: {},
  instruments: {},
  catalog: { status: "idle" },
  song_revision: 0,
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
      catalog_loader: (signal) =>
        load_instrument_catalog(`${service_origin("asset")}/instruments`, {
          signal,
        }),
      on_catalog: (catalog) => {
        if (active) set_state((previous) => ({ ...previous, catalog }));
      },
      on_instruments: (instruments) => {
        if (active) set_state((previous) => ({ ...previous, instruments }));
      },
      on_mix: (mix) => {
        if (active) set_state((previous) => ({ ...previous, mix }));
      },
      on_status: (snapshot) => {
        if (active) set_state((previous) => ({ ...previous, snapshot }));
      },
    });
    controller.current = player;
    void player.refresh_catalog();
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
      song: null,
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
      const song = player.load(bytes);
      set_state((previous) => ({
        ...previous,
        reading: false,
        loaded: true,
        song,
        song_revision: previous.song_revision + 1,
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
  const get_snapshot = useCallback(
    () => controller.current?.snapshot() ?? null,
    [],
  );
  const set_mix = useCallback(
    (id, patch) => controller.current?.set_mix(id, patch),
    [],
  );
  const reset_mix = useCallback(() => controller.current?.reset_mix(), []);
  const set_instrument = useCallback(
    (id, selection) => controller.current?.set_instrument(id, selection),
    [],
  );
  return {
    ...state,
    set_instrument,
    refresh_catalog: () => controller.current?.refresh_catalog(),
    set_mix,
    reset_mix,
    get_snapshot,
    open_file,
    stop,
    play: () => {
      void controller.current?.play();
    },
  };
}
