import assert from "node:assert/strict";
import test from "node:test";
import { play_grass_view } from "../src/pages/games/GamesPlayGrassView.js";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";

test("background unmount aborts loading and prevents late renderer creation; loaded scene is disposed", async () => {
  const source = readFileSync(
    new URL("../src/pages/games/GamesPlayGrass.jsx", import.meta.url),
    "utf8",
  ).replace(/^import[^;]+;\r?\n/gm, "");
  const code = transformSync(source, {
    loader: "jsx",
    format: "cjs",
    jsx: "automatic",
  }).code;
  for (const cancel_first of [true, false]) {
    const module = { exports: {} },
      effects = [],
      calls = [];
    let complete, signal;
    const promise = new Promise((resolve) => {
      complete = resolve;
    });
    runInNewContext(code, {
      module,
      exports: module.exports,
      require: createRequire(import.meta.url),
      AbortController,
      useRef: (value) => ({ current: value }),
      useState: (value) => [value, () => {}],
      useEffect: (fn) => effects.push(fn),
      styled: { div: () => "div" },
      AppText: { get: (v) => v },
      PLAY_GRASS_TEXT: {},
      validate_component_response: (v) => v,
      component_request: (path, options) => {
        calls.push(path);
        signal = options.signal;
        return promise;
      },
      create_play_grass_scene: () => {
        calls.push("create");
        return {
          resize: (w, h) => calls.push([w, h]),
          update: (doc) => calls.push(doc),
          dispose: () => calls.push("dispose"),
        };
      },
    });
    module.exports.default({ width_px: 1200, height_px: 700 });
    const cleanup = effects[0]();
    effects[1]();
    if (cancel_first) cleanup();
    const document = { id: "base-strip" };
    complete({ document });
    await promise;
    await new Promise((resolve) => setImmediate(resolve));
    if (cancel_first) {
      assert.equal(signal.aborted, true);
      assert.equal(calls.includes("create"), false);
    } else {
      assert.ok(calls.includes(document));
      assert.deepEqual(calls.find(Array.isArray), [1200, 700]);
      cleanup();
      assert.equal(calls.at(-1), "dispose");
      assert.equal(signal.aborted, true);
    }
  }
});

test("downward grass cover crop fills normal, fullscreen and extreme portrait views without exposing floor edges", () => {
  const floor = { size: [1, 20] };
  for (const [width, height] of [
    [1280, 650],
    [1920, 1080],
    [390, 844],
    [320, 320],
    [100, 4000],
    [4000, 100],
  ]) {
    const view = play_grass_view(floor, width, height);
    assert.ok(Math.abs(view.width / view.height - width / height) < 1e-9);
    assert.ok(view.width <= 0.97 + 1e-9);
    assert.ok(view.center_z - view.height / 2 >= -9.7 - 1e-9);
    assert.ok(view.center_z + view.height / 2 <= 9.7 + 1e-9);
    assert.ok(
      Math.abs(view.width - 0.97) < 1e-9 || Math.abs(view.height - 19.4) < 1e-9,
    );
  }
  const middle = play_grass_view(floor, 1280, 650);
  assert.equal(middle.center_z, 0.5);
  assert.ok(middle.height < 1);
});
