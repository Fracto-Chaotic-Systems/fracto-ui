const SCROLL_SPEED = 127.5;
const ALERT_SECONDS = 6;

export function crt_broadcast_state(text_width, time, width = 512) {
  const scrolling_seconds = (width + text_width) / SCROLL_SPEED;
  const position = Math.max(0, time) % (scrolling_seconds + ALERT_SECONDS);
  const alert = position >= scrolling_seconds;
  return {
    alert,
    x: width - position * SCROLL_SPEED,
    visible: !alert || Math.floor((position - scrolling_seconds) * 2) % 2 === 0,
  };
}

export function create_crt_broadcast_sequence(
  { message, deploy, translations = [], random = Math.random },
  measure,
  width = 488,
) {
  const english = { message, deploy, direction: "ltr", language: "en" };
  const choices = translations.filter((item) => item.message);
  let current = english,
    cycle = 0,
    start = 0,
    previous;
  const widths = new Map();
  const measured_width = () => {
    if (!widths.has(current.message))
      widths.set(current.message, measure(current.message));
    return widths.get(current.message);
  };
  return (time) => {
    let text_width = measured_width();
    let duration = (width + text_width) / SCROLL_SPEED + ALERT_SECONDS;
    while (time >= start + duration) {
      start += duration;
      cycle++;
      current = english;
      if (cycle % 2 && choices.length) {
        const available = choices.filter((item) => item !== previous);
        const pool = available.length ? available : choices;
        const roll = Math.max(0, Math.min(0.999999, Number(random()) || 0));
        current = pool[Math.floor(roll * pool.length)];
        previous = current;
      }
      text_width = measured_width();
      duration = (width + text_width) / SCROLL_SPEED + ALERT_SECONDS;
    }
    const state = crt_broadcast_state(text_width, time - start, width);
    if (current.direction === "rtl")
      state.x = -text_width + (time - start) * SCROLL_SPEED;
    return { ...state, ...current, cycle };
  };
}

// This overlay uses screen-lifetime time, independent of media and interference.
export function create_crt_broadcast({ message, alert, translations, random }) {
  let sequence;
  return (ctx, { time, width, height, reduced_motion }) => {
    ctx.save();
    ctx.scale(width / 512, height / 384);
    ctx.font = 'bold 32px "Courier New", "Noto Sans", "Segoe UI", sans-serif';
    sequence ??= create_crt_broadcast_sequence(
      { message, deploy: alert, translations, random },
      (text) => ctx.measureText(text).width,
    );
    const state = sequence(time);
    const top = 338;
    ctx.beginPath();
    ctx.rect(12, top, 488, 46);
    ctx.clip();
    ctx.fillStyle = state.alert ? "#ffffff" : "#002caa";
    ctx.fillRect(12, top, 488, 46);
    ctx.textBaseline = "middle";
    ctx.fillStyle = state.alert ? "#d00000" : "#ffffff";
    ctx.shadowBlur = 0;
    if (state.alert) {
      ctx.direction = state.direction || "ltr";
      ctx.textAlign = "center";
      if (state.visible || reduced_motion)
        ctx.fillText(state.deploy || alert, 256, top + 23, 464);
    } else {
      ctx.direction = state.direction || "ltr";
      ctx.textAlign = "left";
      ctx.fillText(state.message, 12 + state.x, top + 23);
    }
    ctx.restore();
  };
}
