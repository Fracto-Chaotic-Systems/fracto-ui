import test from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers";
import { create_prelude_soundtrack } from "../src/pages/games/GamesPlayPreludeAudio.js";

function fixture(play = () => Promise.resolve()) {
  const handlers = new Map(),
    media_handlers = new Map();
  let plays = 0,
    pauses = 0,
    errors = 0;
  const audio = {
    currentTime: 99,
    play() {
      plays++;
      return play();
    },
    pause() {
      pauses++;
    },
    addEventListener: (name, fn) => media_handlers.set(name, fn),
    removeEventListener: (name) => media_handlers.delete(name),
  };
  const page = {
    hidden: false,
    addEventListener: (name, fn) => handlers.set(name, fn),
    removeEventListener: (name) => handlers.delete(name),
  };
  const player = create_prelude_soundtrack(audio, () => errors++, page);
  return {
    audio,
    page,
    player,
    handlers,
    media_handlers,
    counts: () => ({ plays, pauses, errors }),
  };
}

test("Reset calls play synchronously from zero; hide/resume preserves position and confirmation stops it", async () => {
  const f = fixture();
  f.player.start();
  assert.equal(
    f.counts().plays,
    1,
    "Playback must retain the Reset click's user activation",
  );
  assert.equal(f.audio.currentTime, 0);
  f.audio.currentTime = 2.87;
  f.page.hidden = true;
  f.handlers.get("visibilitychange")();
  await Promise.resolve();
  f.page.hidden = false;
  f.handlers.get("visibilitychange")();
  assert.equal(f.audio.currentTime, 2.87);
  assert.equal(f.counts().plays, 2);
  f.player.stop();
  assert.equal(f.audio.currentTime, 0);
  f.page.hidden = true;
  f.handlers.get("visibilitychange")();
  f.page.hidden = false;
  f.handlers.get("visibilitychange")();
  assert.equal(f.counts().plays, 2);
  f.player.dispose();
  assert.equal(f.handlers.size + f.media_handlers.size, 0);
});

test("rejected playback can be retried; stale play promises cannot report errors after stop/reset", async () => {
  const pending = [];
  const f = fixture(
    () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
  );
  f.player.start();
  f.player.start();
  pending[0].reject(new Error("abandoned playback"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.counts().errors, 0);
  pending[1].reject(new Error("blocked"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.counts().errors, 1);
  f.player.start();
  pending[2].resolve();
  await Promise.resolve();
  f.media_handlers.get("error")();
  assert.equal(f.counts().errors, 2);
  f.player.dispose();
});

test("a stale confirmation cannot stop the next run's soundtrack", () => {
  const f = fixture();
  f.player.start(1);
  f.player.start(2);
  const pauses = f.counts().pauses;
  f.audio.currentTime = 0.47;
  f.player.stop(1);
  assert.equal(f.counts().pauses, pauses);
  assert.equal(f.audio.currentTime, 0.47);
  f.player.stop(2);
  assert.equal(f.audio.currentTime, 0);
  f.player.dispose();
});
