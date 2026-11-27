import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { transformSync } from "esbuild";

function fixture(respond) {
  const source = readFileSync(
    new URL("../src/pages/games/ComponentHistoryTab.jsx", import.meta.url),
    "utf8",
  ).replace(/^import[\s\S]*?;\r?\n/gm, "");
  const state = [];
  let cursor = 0;
  const effects = [];
  const requests = [];
  const module = { exports: {} };
  runInNewContext(
    transformSync(source, { loader: "jsx", format: "cjs", jsx: "automatic" })
      .code,
    {
      module,
      exports: module.exports,
      require: createRequire(import.meta.url),
      useState(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [
          state[index],
          (value) => {
            state[index] =
              typeof value === "function" ? value(state[index]) : value;
          },
        ];
      },
      useEffect: (effect) => effects.push(effect),
      AbortController,
      AppText: { get: (key) => key },
      COMPONENT_STAGE_TEXT: new Proxy({}, { get: (_, key) => key }),
      StageHistoryList: "ol",
      component_request: async (path) => {
        requests.push(path);
        return respond(path);
      },
    },
  );
  const render = (props) => {
    cursor = 0;
    effects.length = 0;
    return module.exports.default(props);
  };
  const run_effects = async () => {
    for (const effect of [...effects]) effect();
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  return { render, run_effects, requests };
}
const text_of = (node) =>
  typeof node === "string" || typeof node === "number"
    ? String(node)
    : Array.isArray(node)
      ? Array.from(node).map(text_of).join("")
      : node?.props
        ? text_of(node.props.children)
        : "";

test("history lists dated entries newest first, like a material's history", async () => {
  const f = fixture(() => ({
    history: [
      {
        date: "2026-11-27",
        recorded_at: "2026-11-27T15:04:05.000Z",
        revision: 3,
        action: "rename-component",
        description: 'Renamed "Grass strip" to "Meadow".',
      },
      {
        date: "2026-11-26",
        recorded_at: "2026-11-26T09:00:00.000Z",
        revision: 2,
        action: "history-start",
        description: "History started; earlier changes were not recorded.",
      },
    ],
  }));
  assert.equal(
    text_of(f.render({ id: "doc-1", revision: 3 })),
    "history_loading",
  );
  await f.run_effects();
  const list = f.render({ id: "doc-1", revision: 3 });
  assert.equal(list.type, "ol");
  assert.deepEqual(f.requests, ["/doc-1/history"]);
  const items = Array.from(list.props.children);
  assert.equal(items.length, 2);
  assert.equal(
    text_of(items[0]),
    '2026-11-27 · rename-componentRenamed "Grass strip" to "Meadow".',
  );
  const time = Array.from(items[0].props.children)[0];
  assert.equal(time.type, "time");
  assert.equal(time.props.dateTime, "2026-11-27T15:04:05.000Z");
  // A save (new revision) reloads the history.
  f.render({ id: "doc-1", revision: 4 });
  await f.run_effects();
  assert.equal(f.requests.length, 2);
});

test("unsaved, empty and failed histories say so", async () => {
  const unsaved = fixture(() => ({ history: [] }));
  assert.equal(
    text_of(unsaved.render({ id: "new", revision: 0 })),
    "history_unsaved",
  );
  await unsaved.run_effects();
  assert.deepEqual(unsaved.requests, []);
  const empty = fixture(() => ({ history: [] }));
  empty.render({ id: "doc-1", revision: 1 });
  await empty.run_effects();
  assert.equal(
    text_of(empty.render({ id: "doc-1", revision: 1 })),
    "history_empty",
  );
  const failing = fixture(() => {
    throw new Error("offline");
  });
  failing.render({ id: "doc-1", revision: 1 });
  await failing.run_effects();
  const alert = failing.render({ id: "doc-1", revision: 1 });
  assert.equal(alert.props.role, "alert");
  Array.from(alert.props.children)
    .find((child) => child?.type === "button")
    .props.onClick();
  failing.render({ id: "doc-1", revision: 1 });
  await failing.run_effects();
  assert.equal(failing.requests.length, 2, "retry asks again");
});
