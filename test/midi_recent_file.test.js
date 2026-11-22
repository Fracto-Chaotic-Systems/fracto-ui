import test from "node:test";
import assert from "node:assert/strict";
import {
  read_recent_midi,
  remember_midi,
} from "../src/pages/games/music/MidiRecentFile.js";
import { MAX_MIDI_BYTES } from "@fracto/sdk/music/MidiValidation.js";

// Exercise the asynchronous request/transaction boundary, structured copies and
// failures without depending on a browser or changing production storage code.
function storage({ fail = false, saved = null } = {}) {
  let value = saved;
  let closes = 0;
  const database = {
    close: () => closes++,
    transaction: () => {
      const tx = {};
      tx.objectStore = () => ({
        get: () => {
          const request = {};
          queueMicrotask(() => {
            request.result = structuredClone(value);
            tx.oncomplete();
          });
          return request;
        },
        put: (record) => {
          const request = {};
          queueMicrotask(() => {
            value = structuredClone(record);
            request.result = "last-opened";
            tx.oncomplete();
          });
          return request;
        },
      });
      return tx;
    },
  };
  return {
    open: () => {
      const request = {};
      queueMicrotask(() => {
        if (fail) request.onerror();
        else {
          request.result = database;
          request.onsuccess();
        }
      });
      return request;
    },
    get closes() {
      return closes;
    },
  };
}

test("remembers one local copy, restores independent bytes, and keeps the newest selection", async () => {
  const db = storage();
  assert.equal(await read_recent_midi(db), null);
  const bytes = new Uint8Array([1, 2, 3]).buffer;
  const first = remember_midi("first.mid", bytes, db);
  new Uint8Array(bytes)[0] = 9;
  await first;
  const restored = await read_recent_midi(db);
  assert.equal(restored.name, "first.mid");
  assert.equal(restored.size, 3);
  assert.deepEqual(
    [...new Uint8Array(await restored.arrayBuffer())],
    [1, 2, 3],
  );
  const a = await restored.arrayBuffer();
  new Uint8Array(a)[0] = 8;
  assert.equal(new Uint8Array(await restored.arrayBuffer())[0], 1);
  await Promise.all([
    remember_midi("second.mid", bytes, db),
    remember_midi("latest.mid", bytes, db),
  ]);
  assert.equal((await read_recent_midi(db)).name, "latest.mid");
  assert.ok(db.closes >= 6);
});

test("unavailable storage and invalid or oversized saved data are harmless", async () => {
  const db = storage({ fail: true });
  assert.equal(await read_recent_midi(db), null);
  assert.equal(await remember_midi("test.mid", new ArrayBuffer(1), db), false);
  for (const saved of [
    { name: "bad.mid", bytes: "bad" },
    { name: "empty.mid", bytes: new ArrayBuffer(0) },
    { name: "large.mid", bytes: new ArrayBuffer(MAX_MIDI_BYTES + 1) },
  ])
    assert.equal(await read_recent_midi(storage({ saved })), null);
  assert.equal(await remember_midi("empty.mid", new ArrayBuffer(0), db), false);
});
