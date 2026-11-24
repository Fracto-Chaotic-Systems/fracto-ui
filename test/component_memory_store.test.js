import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { create_component_memory_store } from "../src/pages/games/ComponentMemoryStore.js";
import { EMPTY_CONSTRUCTION_MEMORY } from "@fracto/sdk/FractoConstructionMemory.js";
import {
  persist_object_setting,
  parse_persisted_object,
} from "../src/settings/AppSettingsPersistence.js";
const item = () => ({
  id: randomUUID(),
  revision: 1,
  kind: "recipe",
  title: "Wooded path",
  instructions: "Grass borders and a clear walking corridor.",
  keywords: ["path"],
  enabled: true,
});
function fixture(initial = EMPTY_CONSTRUCTION_MEMORY) {
  let current = structuredClone(initial),
    persisted = JSON.stringify(initial),
    fail = false;
  const settings = {
    get: () => structuredClone(current),
    on_settings_changed(update) {
      current = structuredClone(update.memory);
      persist_object_setting(
        {
          setItem(key, value) {
            if (fail) throw new Error("quota");
            persisted = value;
          },
        },
        "memory",
        { max_persist_length: 65536 },
        current,
      );
    },
  };
  return {
    store: create_component_memory_store(settings, "memory"),
    fail() {
      fail = true;
    },
    reload() {
      current = parse_persisted_object(persisted);
      return create_component_memory_store(settings, "memory");
    },
    get value() {
      return current;
    },
  };
}
test("explicit patterns survive settings reload and edited/deleted patterns replace persisted data", () => {
  const f = fixture(),
    pattern = item();
  f.store.save(pattern, 0);
  let reopened = f.reload();
  assert.deepEqual(reopened.read().patterns, [pattern]);
  reopened.save(
    {
      ...pattern,
      instructions: "Sparse tree spacing",
      enabled: false,
      revision: 2,
    },
    1,
  );
  reopened = f.reload();
  assert.equal(reopened.read().patterns[0].enabled, false);
  assert.equal(reopened.read().patterns[0].instructions, "Sparse tree spacing");
  reopened.remove(pattern.id, 2);
  assert.deepEqual(f.reload().read(), EMPTY_CONSTRUCTION_MEMORY);
});
test("failed persistence restores runtime memory, and unreadable libraries require explicit reset", () => {
  const f = fixture();
  f.fail();
  assert.throws(() => f.store.save(item(), 0), /memory_storage_error/);
  assert.deepEqual(f.value, EMPTY_CONSTRUCTION_MEMORY);
  assert.deepEqual(f.reload().read(), EMPTY_CONSTRUCTION_MEMORY);
  const invalid = fixture({ schema_version: 99, patterns: [] });
  assert.throws(() => invalid.store.read(), /memory_invalid/);
  assert.throws(() => invalid.store.save(item(), 0), /memory_invalid/);
  invalid.store.reset();
  assert.deepEqual(invalid.reload().read(), EMPTY_CONSTRUCTION_MEMORY);
});
