import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

test("browser capture includes rendered silence after the last input disconnects", async () => {
  let Processor;
  const messages = [];
  const scope = {
    AudioWorkletProcessor: class {
      constructor() {
        this.port = { postMessage: (message) => messages.push(message) };
      }
    },
    registerProcessor: (_name, implementation) => {
      Processor = implementation;
    },
    currentTime: 2,
    Float32Array,
  };
  vm.runInNewContext(
    await fs.readFile(
      new URL("./midi_browser/capture-worklet.js", import.meta.url),
      "utf8",
    ),
    scope,
  );
  const capture = new Processor();
  const mono = new Float32Array([0.2, -0.4]);
  assert.equal(capture.process([[mono]]), true);
  assert.deepEqual(messages[0].left, mono);
  assert.deepEqual(messages[0].right, mono);
  assert.notEqual(messages[0].left, mono);
  scope.currentTime = 3;
  assert.equal(capture.process([[]]), true);
  assert.equal(messages[1].time, 3);
  assert.equal(messages[1].left.length, 128);
  assert.ok(messages[1].left.every((value) => value === 0));
  assert.ok(messages[1].right.every((value) => value === 0));
});
