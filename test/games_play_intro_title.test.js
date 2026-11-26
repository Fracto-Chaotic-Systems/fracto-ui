import assert from "node:assert/strict";
import test from "node:test";
import {
  INTRO_TITLE_SECONDS,
  watch_intro_title_cue,
  INTRO_TITLE_FADE_SECONDS,
  INTRO_TITLE_END_SECONDS,
  intro_title_opacity,
} from "../src/pages/games/GamesPlayIntroTitleCue.js";

function clock() {
  const frames = new Map(),
    events = new Map();
  let id = 0;
  const audio = { currentTime: 12.17 };
  const document = {
    hidden: false,
    addEventListener: (name, fn) => events.set(name, fn),
    removeEventListener: (name) => events.delete(name),
  };
  return {
    audio,
    frames,
    events,
    environment: {
      document,
      window: {
        requestAnimationFrame(fn) {
          frames.set(++id, fn);
          return id;
        },
        cancelAnimationFrame: (key) => frames.delete(key),
      },
    },
    frame(seconds) {
      const [key, fn] = frames.entries().next().value;
      frames.delete(key);
      audio.currentTime = seconds;
      fn(999999);
    },
  };
}

test("FRACTO appears once at audio 29.5s, never from elapsed wall time or buffering", () => {
  const c = clock();
  let cues = 0;
  const stop = watch_intro_title_cue(c.audio, () => cues++, c.environment);
  for (const seconds of [12.17, 29, 29.499, 29.499]) c.frame(seconds);
  assert.equal(cues, 0);
  c.frame(INTRO_TITLE_SECONDS);
  assert.equal(cues, 1);
  c.frame(30);
  assert.equal(cues, 1);
  assert.equal(c.frames.size, 1);
  stop();
  assert.equal(c.events.size, 0);
});

test("title fades linearly over five audio seconds and is gone at 42.21s", () => {
  const c = clock();
  const opacities = [];
  const stop = watch_intro_title_cue(
    c.audio,
    (value) => opacities.push(value),
    c.environment,
  );
  c.frame(INTRO_TITLE_SECONDS);
  c.frame(INTRO_TITLE_FADE_SECONDS);
  assert.deepEqual(opacities, [1]);
  c.frame(39.71);
  assert.ok(Math.abs(opacities.at(-1) - 0.5) < 1e-12);
  const count = opacities.length;
  c.frame(39.71);
  assert.equal(opacities.length, count, "Buffering must pause the fade");
  c.frame(INTRO_TITLE_END_SECONDS);
  assert.equal(opacities.at(-1), 0);
  assert.equal(c.frames.size, 0);
  stop();
  for (const seconds of [0, 29.499, 42.21, 60])
    assert.equal(intro_title_opacity(seconds), 0);
  const late = clock();
  const late_values = [];
  watch_intro_title_cue(
    late.audio,
    (value) => late_values.push(value),
    late.environment,
  );
  late.frame(45);
  assert.deepEqual(
    late_values,
    [],
    "Late observation must not flash an expired title",
  );
  assert.equal(late.frames.size, 0);
});

test("hidden tabs defer observation and abandoned welcome runs cannot reveal the title", () => {
  const c = clock();
  let cues = 0;
  const stop = watch_intro_title_cue(c.audio, () => cues++, c.environment);
  c.environment.document.hidden = true;
  c.events.get("visibilitychange")();
  assert.equal(c.frames.size, 0);
  c.environment.document.hidden = false;
  c.events.get("visibilitychange")();
  const stale = [...c.frames.values()][0];
  stop();
  c.audio.currentTime = 30;
  stale();
  assert.equal(cues, 0);
  assert.equal(c.frames.size, 0);
  assert.equal(c.events.size, 0);
});
