import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import {
  sample_play_prelude,
  start_play_prelude,
  PRELUDE_DURATION_SECONDS,
} from "../src/pages/games/GamesPlayPreludeTimeline.js";

test("white opening, spreading centered welcome, smaller to, simultaneous TV/CHAOS and slow final fade", () => {
  const blank = sample_play_prelude(0);
  assert.equal(
    blank.welcome_opacity + blank.to_opacity + blank.chaos_opacity,
    0,
  );
  assert.equal(blank.tv_visible, false);
  assert.ok(sample_play_prelude(1).welcome_opacity > 0);
  assert.equal(sample_play_prelude(2).welcome_opacity, 1);
  assert.equal(sample_play_prelude(0.469).welcome_opacity, 0);
  assert.ok(sample_play_prelude(0.471).welcome_opacity > 0);
  assert.equal(sample_play_prelude(2.869).to_opacity, 0);
  assert.ok(sample_play_prelude(2.871).to_opacity > 0);
  assert.ok(
    sample_play_prelude(3).welcome_spacing_em >
      sample_play_prelude(1).welcome_spacing_em,
  );
  const overlap = sample_play_prelude(3.1);
  assert.ok(
    overlap.welcome_opacity > 0 &&
      overlap.welcome_opacity < 1 &&
      overlap.to_opacity > 0,
  );
  assert.equal(sample_play_prelude(4.05).to_opacity, 0);
  assert.equal(sample_play_prelude(3.999).tv_visible, false);
  const arrival = sample_play_prelude(4);
  assert.equal(arrival.tv_visible, true);
  assert.equal(arrival.chaos_opacity, 1);
  assert.equal(arrival.welcome_opacity + arrival.to_opacity, 0);
  assert.equal(sample_play_prelude(6.17).chaos_opacity, 1);
  assert.equal(sample_play_prelude(9.17).chaos_opacity, 0.5);
  assert.equal(sample_play_prelude(12.17).chaos_opacity, 0);
  assert.equal(sample_play_prelude(12.17).complete, true);
});

function clock() {
  let id = 0;
  const frames = new Map(),
    handlers = new Map();
  const document = {
    hidden: false,
    addEventListener: (name, fn) => handlers.set(name, fn),
    removeEventListener: (name) => handlers.delete(name),
  };
  const audio = { currentTime: 0 };
  return {
    audio,
    frames,
    handlers,
    environment: {
      document,
      window: {
        requestAnimationFrame: (fn) => {
          frames.set(++id, fn);
          return id;
        },
        cancelAnimationFrame: (id) => frames.delete(id),
      },
    },
    frame(seconds) {
      const [id, fn] = frames.entries().next().value;
      frames.delete(id);
      audio.currentTime = seconds;
      fn(999999); // Wall-clock timestamps must not affect audio synchronization.
    },
  };
}
test("buffering holds text at the audio position, and late frames catch up without shifting cues", () => {
  const c = clock(),
    samples = [];
  const stop = start_play_prelude(
    (seconds) => samples.push(seconds),
    c.audio,
    c.environment,
  );
  c.frame(0.47);
  c.frame(0.47);
  assert.deepEqual(samples, [0.47, 0.47]);
  c.frame(4.17);
  assert.equal(samples.at(-1), 4.17);
  assert.equal(sample_play_prelude(samples.at(-1)).tv_visible, true);
  stop();
});
test("audio timeline stops observing hidden tabs, completes once, and cancels on skip/reset", () => {
  const c = clock(),
    samples = [];
  const stop = start_play_prelude(
    (t) => samples.push(t),
    c.audio,
    c.environment,
  );
  c.frame(0);
  c.frame(2.87);
  assert.equal(samples.at(-1), 2.87);
  c.environment.document.hidden = true;
  c.handlers.get("visibilitychange")();
  assert.equal(c.frames.size, 0);
  c.environment.document.hidden = false;
  c.handlers.get("visibilitychange")();
  c.frame(2.87);
  assert.equal(samples.at(-1), 2.87);
  c.frame(PRELUDE_DURATION_SECONDS);
  assert.equal(samples.at(-1), PRELUDE_DURATION_SECONDS);
  assert.equal(samples.filter((t) => t === PRELUDE_DURATION_SECONDS).length, 1);
  assert.equal(c.frames.size, 0);
  stop();
  assert.equal(c.handlers.size, 0);
  const skipped = clock();
  let calls = 0;
  const skip = start_play_prelude(
    () => calls++,
    skipped.audio,
    skipped.environment,
  );
  const pending = [...skipped.frames.values()][0];
  skip();
  skip();
  pending(10);
  assert.equal(calls, 0);
  assert.equal(skipped.frames.size, 0);
  assert.equal(skipped.handlers.size, 0);
});

test("prelude announces the TV and completes once without restarting when its timeline advances", () => {
  const source = readFileSync(
    new URL("../src/pages/games/GamesPlayPrelude.jsx", import.meta.url),
    "utf8",
  ).replace(/^import[\s\S]*?;\r?\n/gm, "");
  const module = { exports: {} },
    effects = [];
  let sample,
    reveals = 0,
    prepares = 0,
    completed = 0,
    stopped = 0;
  vm.runInNewContext(
    transformSync(source, { loader: "jsx", format: "cjs" }).code,
    {
      module,
      exports: module.exports,
      React: { createElement: () => null },
      styled: Object.assign(() => () => "div", {
        section: () => "section",
        div: () => "div",
        button: () => "button",
      }),
      useRef: () => ({ current: { focus() {} } }),
      useState: () => [0, () => {}],
      useEffect: (fn) => effects.push(fn),
      AppText: { get: (key) => key },
      PLAY_FLOW_TEXT: {},
      sample_play_prelude,
      start_play_prelude: (fn) => {
        sample = fn;
        return () => stopped++;
      },
    },
  );
  module.exports.default({
    audio_ref: { current: { currentTime: 0 } },
    on_complete: () => completed++,
    on_tv_reveal: () => reveals++,
    on_prepare: () => prepares++,
  });
  const cleanup = effects.at(-1)();
  for (const t of [0, 0.47, 0.8, 2.87, 4.17, 4.3, 10, 12.17]) sample(t);
  assert.equal(prepares, 1);
  assert.equal(reveals, 1);
  assert.equal(completed, 1);
  cleanup();
  assert.equal(stopped, 1);
});
