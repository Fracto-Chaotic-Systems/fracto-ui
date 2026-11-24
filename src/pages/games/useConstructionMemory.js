import { useEffect, useState } from "react";
import AppSettings from "../../AppSettings.jsx";
import { KEY_GAMES_CONSTRUCTION_MEMORY } from "../../settings/GamesSettings.jsx";
import { create_component_memory_store } from "./ComponentMemoryStore.js";
const store = create_component_memory_store(
  AppSettings,
  KEY_GAMES_CONSTRUCTION_MEMORY,
);
const snapshot = () => {
  try {
    return { library: store.read(), error: null };
  } catch {
    return { library: null, error: "memory_invalid" };
  }
};
export default function useConstructionMemory() {
  const [state, set_state] = useState(snapshot),
    [error, set_error] = useState(null);
  useEffect(() => {
    const subscription = AppSettings.subscribe(
      KEY_GAMES_CONSTRUCTION_MEMORY,
      () => set_state(snapshot()),
    );
    return () => AppSettings.unsubscribe(subscription);
  }, []);
  const run = (action) => {
    try {
      action();
      set_state(snapshot());
      set_error(null);
      return true;
    } catch (failure) {
      set_error(failure.message);
      return false;
    }
  };
  return {
    library: state.library,
    error: error || state.error,
    save: (pattern, revision) => run(() => store.save(pattern, revision)),
    remove: (pattern) => run(() => store.remove(pattern.id, pattern.revision)),
    toggle: (pattern) =>
      run(() =>
        store.save(
          {
            ...pattern,
            revision: pattern.revision + 1,
            enabled: !pattern.enabled,
          },
          pattern.revision,
        ),
      ),
    reset: () => run(() => store.reset()),
  };
}
