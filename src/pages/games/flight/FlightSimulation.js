import {
  step_flight_state,
  neutralize_flight_channels,
} from "./FlightDynamics.js";

// Start from an effect, not a state initializer, so StrictMode can cleanly rebind.
export function start_flight_simulation(
  flight_state,
  controls,
  environment = { window, document },
) {
  const { window: target_window, document: target_document } = environment;
  let active = true;
  let suspended = !!target_document.hidden;
  let frame = null;
  let last_time = null;
  const unsubscribe_neutralize = controls.subscribe_neutralize?.((channels) => {
    if (active)
      flight_state.update(
        neutralize_flight_channels(flight_state.get_snapshot(), channels),
      );
  });
  const schedule = () => {
    if (active && !suspended && !target_document.hidden && frame === null) {
      frame = target_window.requestAnimationFrame(tick);
    }
  };
  const tick = (time) => {
    frame = null;
    if (!active || suspended || target_document.hidden) return;
    if (Number.isFinite(time)) {
      if (last_time !== null) {
        const dt = Math.min(0.1, Math.max(0, (time - last_time) / 1000));
        flight_state.update(
          step_flight_state(
            flight_state.get_snapshot(),
            controls.get_snapshot(),
            dt,
          ),
        );
      }
      last_time = time;
    } else last_time = null;
    schedule();
  };
  const reset_clock = () => {
    if (frame !== null) target_window.cancelAnimationFrame(frame);
    frame = null;
    last_time = null;
  };
  const blur = () => {
    suspended = true;
    reset_clock();
  };
  const resume = () => {
    suspended = !!target_document.hidden;
    reset_clock();
    schedule();
  };
  target_window.addEventListener("blur", blur);
  target_window.addEventListener("focus", resume);
  target_document.addEventListener("visibilitychange", resume);
  schedule();
  return () => {
    if (!active) return;
    active = false;
    unsubscribe_neutralize?.();
    reset_clock();
    target_window.removeEventListener("blur", blur);
    target_window.removeEventListener("focus", resume);
    target_document.removeEventListener("visibilitychange", resume);
  };
}
