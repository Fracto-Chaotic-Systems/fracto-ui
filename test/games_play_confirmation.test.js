import assert from "node:assert/strict";
import test from "node:test";
import { start_confirmation_prompt } from "../src/pages/games/GamesPlayConfirmationTiming.js";

test("confirmation phrases hold irregularly, sometimes flicker, and stop when hidden or disposed", () => {
  let pending, visibility;
  const shown = [],
    delays = [],
    random = [0, 0.1, 0.5, 1, 1, 0.9];
  const page = {
    hidden: false,
    addEventListener: (_, fn) => {
      visibility = fn;
    },
    removeEventListener: (_, fn) => {
      assert.equal(fn, visibility);
      visibility = null;
    },
  };
  const stop = start_confirmation_prompt((value) => shown.push(value), {
    window: {
      setTimeout(fn, ms) {
        pending = fn;
        delays.push(ms);
        return fn;
      },
      clearTimeout() {
        pending = null;
      },
    },
    document: page,
    random: () => random.shift() ?? 0.5,
  });
  assert.equal(delays[0], 2500);
  pending();
  assert.deepEqual(shown, [true]);
  assert.equal(delays[1], 135);
  pending();
  assert.deepEqual(shown, [true, false]);
  assert.equal(delays[2], 200);
  pending();
  assert.deepEqual(shown, [true, false, true]);
  assert.equal(delays[3], 8500);
  const stale = pending;
  page.hidden = true;
  visibility();
  assert.equal(pending, null);
  stale();
  assert.equal(shown.length, 3);
  page.hidden = false;
  visibility();
  assert.equal(delays.at(-1), 7900);
  const disposed = pending;
  stop();
  disposed();
  assert.equal(shown.length, 3);
  assert.equal(pending, null);
  assert.equal(visibility, null);
});
