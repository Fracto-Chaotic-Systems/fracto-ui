import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  create_bundle_rebuilder,
  relevant_bundle_source,
  knowledge_bundle_plugin,
} from "../scripts/knowledge_bundle_plugin.js";

test("development bundle builds debounce events, serialize in-flight changes and stop cleanly", () => {
  const timers = new Map(),
    builds = [],
    reports = [];
  let next = 0,
    killed = 0;
  const builder = create_bundle_rebuilder({
    schedule: (callback, interval) => {
      assert.equal(interval, 300);
      timers.set(++next, callback);
      return next;
    },
    unschedule: (id) => timers.delete(id),
    run: (done) => {
      builds.push(done);
      return {
        kill() {
          killed++;
        },
      };
    },
    report: (failed) => reports.push(failed),
  });
  const tick = () => {
    const pending = [...timers.values()];
    timers.clear();
    pending.forEach((callback) => callback());
  };
  builder.request();
  builder.request();
  builder.request();
  assert.equal(timers.size, 1);
  tick();
  assert.equal(builds.length, 1);
  builder.request();
  tick();
  assert.equal(builds.length, 1);
  builds[0](null);
  tick();
  assert.equal(builds.length, 2);
  builds[1](new Error("private details"));
  assert.deepEqual(reports, [false, true]);
  builder.request();
  tick();
  builder.close();
  assert.equal(killed, 1);
  builds[2](null);
  builder.request();
  tick();
  assert.equal(builds.length, 3);
  assert.deepEqual(reports, [false, true]);
});

test("development watch selection ignores dependencies, runtime, generated output and unrelated workspace files", () => {
  const ui = path.resolve(import.meta.dirname, "..");
  for (const file of [
    "src/features/catalog.json",
    "src/pages/admin/AdminChat.jsx",
    "src/text/AdminText.jsx",
    "scripts/check_feature_catalog.js",
  ])
    assert.equal(relevant_bundle_source(path.join(ui, file)), true, file);
  for (const file of [
    "node_modules/library/index.js",
    "runtime/events.json",
    "generated/knowledge/ui-features.bundle.json",
    "../fracto-ai-server/runtime/knowledge.json",
    "src/image.png",
    ".env",
    "package-lock.json",
  ])
    assert.equal(relevant_bundle_source(path.join(ui, file)), false, file);
  assert.equal(knowledge_bundle_plugin().apply, "serve");
  assert.equal(
    relevant_bundle_source(
      path.resolve(ui, "../fracto-ai-server/subject_providers/ui.json"),
    ),
    true,
  );
});
