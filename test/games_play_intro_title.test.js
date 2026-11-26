import assert from "node:assert/strict";
import test from "node:test";
import {
  INTRO_TITLE_SECONDS,
  watch_intro_title_cue,
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

test("FRACTO appears once at audio 29.66s, never from elapsed wall time or buffering", () => {
  const c = clock();
  let cues = 0;
  const stop = watch_intro_title_cue(c.audio, () => cues++, c.environment);
  for (const seconds of [12.17, 29, 29.659, 29.659]) c.frame(seconds);
  assert.equal(cues, 0);
  c.frame(INTRO_TITLE_SECONDS);
  assert.equal(cues, 1);
  assert.equal(c.frames.size, 0);
  stop();
  assert.equal(c.events.size, 0);
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
