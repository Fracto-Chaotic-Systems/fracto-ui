import { useEffect, useRef, useState } from "react";
import {
  resolve_component_material,
  resolve_component_references,
} from "./ComponentMaterialApi.js";
export default function useComponentConstruction(editor) {
  const [material, set_material] = useState(null),
    [busy, set_busy] = useState(false),
    [error, set_error] = useState(null);
  const pending = useRef(null);
  useEffect(() => () => pending.current?.abort(), []);
  const run = async (operation) => {
    if (pending.current || editor.busy) return;
    const controller = new AbortController();
    pending.current = controller;
    set_busy(true);
    set_error(null);
    try {
      await operation(controller.signal);
    } catch (failure) {
      if (!controller.signal.aborted) set_error(failure.message);
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) set_busy(false);
    }
  };
  return {
    material,
    busy,
    error,
    choose(selected) {
      return run(async (signal) =>
        set_material(
          await resolve_component_material(
            { id: selected.id, revision: selected.revision },
            signal,
          ),
        ),
      );
    },
    execute(commands) {
      return run(async (signal) => {
        const refs = commands
          .map(
            (command) =>
              command.asset ||
              command.object?.asset ||
              command.rule?.asset ||
              command.floor?.asset,
          )
          .filter(Boolean);
        const materials = await resolve_component_references(refs, signal);
        signal.throwIfAborted();
        editor.construct(commands, materials, editor.history.present.id);
      });
    },
  };
}
