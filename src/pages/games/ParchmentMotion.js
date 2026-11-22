const angle_delta = (target, angle) =>
  ((((target - angle + 180) % 360) + 360) % 360) - 180;

// An analytically integrated damped spring keeps the lag independent of frame rate.
export function advance_parchment_roll(state, target, dt) {
  const step = Math.max(0, Math.min(0.1, Number(dt) || 0));
  const destination = state.angle + angle_delta(target, state.angle);
  const offset = state.angle - destination;
  const decay = 2.55;
  const frequency = Math.sqrt(9 - decay * decay);
  const b = (state.velocity + decay * offset) / frequency;
  const sine = Math.sin(frequency * step),
    cosine = Math.cos(frequency * step);
  const envelope = Math.exp(-decay * step);
  state.angle = destination + envelope * (offset * cosine + b * sine);
  state.velocity =
    envelope *
    ((-decay * offset + frequency * b) * cosine +
      (-decay * b - frequency * offset) * sine);
  const settled =
    Math.abs(angle_delta(target, state.angle)) < 0.01 &&
    Math.abs(state.velocity) < 0.02;
  if (settled) {
    state.angle += angle_delta(target, state.angle);
    state.velocity = 0;
  }
  return settled;
}

export function bind_parchment_roll(element, flight_state, on_roll = () => {}) {
  const read_target = () => -flight_state.get_snapshot().roll_deg;
  let target = read_target();
  const initial = parseFloat(
    element.style.getPropertyValue("--parchment-roll"),
  );
  const state = {
    angle: Number.isFinite(initial) ? initial : target,
    velocity: 0,
  };
  const reduced_motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = null,
    previous = 0;
  const paint = () => {
    element.style.setProperty("--parchment-roll", `${state.angle}deg`);
    on_roll(state.angle);
  };
  const stop = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  };
  const animate = (time) => {
    frame = null;
    const settled = advance_parchment_roll(
      state,
      target,
      previous ? (time - previous) / 1000 : 1 / 60,
    );
    previous = time;
    paint();
    if (!settled && !document.hidden) frame = requestAnimationFrame(animate);
  };
  const wake = () => {
    if (reduced_motion.matches) {
      stop();
      state.angle = target;
      state.velocity = 0;
      paint();
    } else if (!document.hidden && frame === null) {
      previous = 0;
      frame = requestAnimationFrame(animate);
    }
  };
  const update = () => {
    const next = read_target();
    if (next === target) return;
    target = next;
    wake();
  };
  const visibility = () => {
    if (document.hidden) stop();
    else {
      target = read_target();
      wake();
    }
  };
  const unsubscribe = flight_state.subscribe(update);
  reduced_motion.addEventListener("change", wake);
  document.addEventListener("visibilitychange", visibility);
  paint();
  wake();
  return () => {
    stop();
    unsubscribe();
    reduced_motion.removeEventListener("change", wake);
    document.removeEventListener("visibilitychange", visibility);
  };
}
