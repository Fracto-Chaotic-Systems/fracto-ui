const clamp = (value, min, max) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : 0;

export function normalize_controller_state(state) {
  const connected = !!state?.connected;
  return Object.freeze({
    connected,
    axes: Object.freeze(
      Array.from({ length: 4 }, (_, index) =>
        connected ? clamp(state.axes?.[index], -1, 1) : 0,
      ),
    ),
    buttons: Object.freeze(
      Array.from({ length: 18 }, (_, index) => {
        const button = connected ? state.buttons?.[index] : null;
        return Object.freeze({
          value: clamp(button?.value, 0, 1),
          pressed: !!button?.pressed,
          touched: !!button?.touched,
        });
      }),
    ),
  });
}

export function create_controller_input() {
  let snapshot = normalize_controller_state(null);
  const listeners = new Set();
  const update = (state) => {
    const next = normalize_controller_state(state);
    if (JSON.stringify(next) === JSON.stringify(snapshot)) return;
    snapshot = next;
    listeners.forEach((listener) => listener(snapshot));
  };
  return {
    get_snapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update,
    reset: () => update(null),
  };
}
