import assert from "node:assert/strict";
import test from "node:test";
import { play_grass_view } from "../src/pages/games/GamesPlayGrassView.js";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import * as THREE from "three";
import { create_path_motion_controller } from "@fracto/sdk/FractoPathMotion.js";
import { apply_top_down_path_pose } from "../src/utils/render/TopDownPathCamera.js";
const path_motion = JSON.parse(
  readFileSync(
    new URL("../public/motions/slow-strip-patrol.json", import.meta.url),
    "utf8",
  ),
);

test("background unmount aborts loading and prevents late renderer creation; loaded scene is disposed", async () => {
  const source = readFileSync(
    new URL("../src/pages/games/GamesPlayGrass.jsx", import.meta.url),
    "utf8",
  )
    .replace(/^import[^;]+;\r?\n/gm, "")
    .replaceAll("import.meta.env.BASE_URL", '"/"');
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
      PLAY_GRASS_RELEASE: { key: "grass-strip", release: "a".repeat(64) },
      component_runtime_manifest_url: () =>
        "http://runtime.invalid/grass-strip/manifest.json",
      load_path_motion: async () => path_motion,
      load_component_runtime: (path, request_signal) => {
        calls.push(path);
        signal = request_signal;
        return promise;
      },
      create_play_grass_scene: (host, options) => {
        assert.equal(options.path_motion, path_motion);
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

test("path camera remains downward and all rotating crop corners stay inside the dirt at both endpoints", () => {
  const floor = { size: [1, 20] };
  const motion = create_path_motion_controller(path_motion);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.001, 100);
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
    assert.ok(Math.abs(Math.hypot(view.width, view.height) - 0.97) < 1e-9);
    camera.left = -view.width / 2;
    camera.right = view.width / 2;
    camera.top = view.height / 2;
    camera.bottom = -view.height / 2;
    camera.updateProjectionMatrix();
    for (const leg of [0, 1])
      for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
        const pose = motion.sample(
          leg * motion.leg_seconds +
            motion.travel_seconds +
            path_motion.pause_seconds +
            fraction * path_motion.turn_seconds,
        );
        apply_top_down_path_pose(camera, pose);
        assert.ok(
          camera
            .getWorldDirection(new THREE.Vector3())
            .distanceTo(new THREE.Vector3(0, -1, 0)) < 1e-9,
        );
        for (const x of [-1, 1])
          for (const y of [-1, 1]) {
            const p = new THREE.Vector3(x, y, 0).unproject(camera);
            assert.ok(
              Math.abs(p.x) < 0.5 && Math.abs(p.z) < 10,
              `${width}x${height} exposed dirt edge`,
            );
          }
      }
  }
  const middle = play_grass_view(floor, 1280, 650);
  assert.ok(middle.height < 1);
});
