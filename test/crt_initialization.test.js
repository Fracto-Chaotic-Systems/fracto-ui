import assert from "node:assert/strict";
import test from "node:test";
import { defer_crt_initialization } from "../src/pages/games/CrtInitialization.js";

function scheduler() {
  let id = 0;
  const frames = new Map(),
    tasks = new Map();
  const take = (queue) => {
    const [key, fn] = queue.entries().next().value;
    queue.delete(key);
    fn();
  };
  return {
    frames,
    tasks,
    frame: () => take(frames),
    task: () => take(tasks),
    target: {
      requestAnimationFrame(fn) {
        frames.set(++id, fn);
        return id;
      },
      cancelAnimationFrame: (key) => frames.delete(key),
      setTimeout(fn) {
        tasks.set(++id, fn);
        return id;
      },
      clearTimeout: (key) => tasks.delete(key),
    },
  };
}

test("graphics wait for a painted frame and separate task; cleanup runs once", () => {
  const clock = scheduler();
  let starts = 0,
    stops = 0;
  const stop = defer_crt_initialization(() => {
    starts++;
    return () => stops++;
  }, clock.target);
  assert.equal(starts, 0);
  clock.frame();
  assert.equal(starts, 0);
  clock.frame();
  assert.equal(starts, 0);
  clock.task();
  assert.equal(starts, 1);
  stop();
  stop();
  assert.equal(stops, 1);
});

test("abandoned and StrictMode mounts cancel graphics before context creation", () => {
  for (const frames of [0, 1, 2]) {
    const clock = scheduler();
    let starts = 0;
    const stop = defer_crt_initialization(() => starts++, clock.target);
    for (let i = 0; i < frames; i++) clock.frame();
    const pending = [...clock.frames.values(), ...clock.tasks.values()];
    stop();
    pending.forEach((fn) => fn());
    assert.equal(starts, 0);
    assert.equal(clock.frames.size + clock.tasks.size, 0);
  }
});
