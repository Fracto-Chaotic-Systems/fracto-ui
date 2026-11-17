import { service_origin } from "../../../utils/service_origin.jsx";
import { load_instrument_catalog } from "./MidiInstrumentCatalog.js";
import { useCallback, useEffect, useRef, useState } from "react";
import MidiPlaybackController from "./MidiPlaybackController.js";
import { MAX_MIDI_BYTES } from "./MidiValidation.js";
import { INSTRUMENT_REGISTRY } from "./MidiInstruments.js";
import { read_recent_midi, remember_midi } from "./MidiRecentFile.js";

const SOUND_LIBRARY_ID = "fluidr3-gm";

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
  const open_file = useCallback(async (file, { remember = true } = {}) => {
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
      if (remember) void remember_midi(file.name, bytes);
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
  }, []);
  useEffect(() => {
    let active = true;
    const player = new MidiPlaybackController({
      // All Music fixes its library; shared controller/Legacy support is retained.
      instrument_registry: INSTRUMENT_REGISTRY.with_library(SOUND_LIBRARY_ID),
      catalog_loader: async (signal) => {
        const result = await load_instrument_catalog(
          `${service_origin("asset")}/instruments`,
          { signal },
        );
        return {
          ...result,
          registry: result.registry.with_library(SOUND_LIBRARY_ID),
        };
      },
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
    const restore_generation = generation.current;
    void read_recent_midi().then((file) => {
      if (
        active &&
        file &&
        generation.current === restore_generation &&
        controller.current === player
      )
        void open_file(file, { remember: false });
    });
    return () => {
      active = false;
      controller.current = null;
      void player.dispose();
    };
  }, [open_file]);
  useEffect(() => {
    if (state.snapshot.status !== "playing") return;
    const timer = setInterval(() => {
      const snapshot = controller.current?.snapshot();
      if (snapshot) set_state((previous) => ({ ...previous, snapshot }));
    }, 200);
    return () => clearInterval(timer);
  }, [state.snapshot.status]);

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
    set_library: (id) => controller.current?.set_library(id),
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
