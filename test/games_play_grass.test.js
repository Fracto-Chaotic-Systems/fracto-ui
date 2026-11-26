import assert from "node:assert/strict";
import test from "node:test";
import { play_grass_view } from "../src/pages/games/GamesPlayGrassView.js";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { setImmediate } from "node:timers";
import { transformSync } from "esbuild";
import * as THREE from "three";
import { create_path_motion_controller } from "@fracto/sdk/FractoPathMotion.js";
import { apply_top_down_path_pose } from "../src/utils/render/TopDownPathCamera.js";
import { play_traversal_start_seconds } from "../src/pages/games/GamesPlayTraversalStart.js";
const path_motion = JSON.parse(
  readFileSync(
    new URL("../public/motions/slow-strip-patrol.json", import.meta.url),
    "utf8",
  ),
);

for (const introduction of [false, true])
  test(`arrival fades ${introduction ? "with moving introduction" : "during loading and after idle gaps"}`, async () => {
    const source = readFileSync(
      new URL("../src/pages/games/GamesPlayGrassScene.js", import.meta.url),
      "utf8",
    ).replace(/^import[^;]+;\r?\n/gm, "");
    const module = { exports: {} },
      frames = new Map(),
      calls = [],
      camera_positions = [];
    let options,
      complete,
      remaining = 0;
    const content = {
      root: new THREE.Group(),
      revision: 0,
      revealing: false,
      introduction_complete: !introduction,
      reveal(delta) {
        calls.push(["reveal", delta]);
        remaining -= delta;
        this.revealing = remaining > 1e-8;
      },
      animate() {
        calls.push("animate");
      },
      focus() {
        return false; // Initial material loads cannot block motion during the introduction.
      },
      update() {
        options.on_status("loading_content");
        return new Promise((resolve) => {
          complete = resolve;
        });
      },
      release_introduction() {},
      dispose() {},
    };
    class Renderer {
      constructor() {
        this.domElement = {
          style: {},
          addEventListener() {},
          removeEventListener() {},
          remove() {},
        };
      }
      setPixelRatio() {}
      setSize() {}
      render(scene, camera) {
        camera_positions.push(camera.position.z);
      }
      dispose() {}
      forceContextLoss() {}
    }
    let next_frame = 0;
    runInNewContext(transformSync(source, { format: "cjs" }).code, {
      module,
      exports: module.exports,
      THREE: { ...THREE, WebGLRenderer: Renderer },
      window: { devicePixelRatio: 1 },
      document: {
        hidden: false,
        addEventListener() {},
        removeEventListener() {},
      },
      requestAnimationFrame(fn) {
        frames.set(++next_frame, fn);
        return next_frame;
      },
      cancelAnimationFrame(id) {
        frames.delete(id);
      },
      create_component_section_content(value) {
        options = value;
        return content;
      },
      create_path_motion_controller,
      play_traversal_start_seconds,
      grass_introduction_rank() {},
      GRASS_INTRODUCTION: {},
      apply_top_down_path_pose,
      play_grass_view,
      configure_component_shadows() {},
      fit_component_shadows() {},
      update_component_lighting() {},
    });
    const runtime = module.exports.create_play_grass_scene(
      { prepend() {} },
      {
        path_motion,
        introduction,
        start_fraction: introduction ? 0.5 : 0,
        resolve_materials() {},
        on_error() {
          assert.fail("unexpected renderer error");
        },
      },
    );
    const pending = runtime.update({ floor: { size: [1, 20] } });
    const arrive = () => {
      remaining = 0.2;
      content.revealing = true;
      options.render();
    };
    const frame = (time) => {
      const [id, fn] = frames.entries().next().value;
      frames.delete(id);
      fn(time);
    };
    arrive();
    assert.equal(frames.size, 1);
    frame(100);
    frame(200);
    frame(300);
    if (introduction) {
      assert.ok(
        Math.abs(camera_positions[0]) < 1e-8,
        "Initial resident sections and camera use the chosen middle-of-strip start",
      );
      assert.equal(frames.size, 1);
      assert.ok(calls.includes("animate"));
      assert.ok(
        camera_positions.some((z) => Math.abs(z - camera_positions[0]) > 1e-10),
        "Camera moves before content_ready even when focus reports pending sections",
      );
      runtime.dispose();
      complete();
      await pending;
      assert.equal(frames.size, 0);
      return;
    }
    assert.equal(frames.size, 0);
    assert.ok(!calls.includes("animate"));
    const before = calls.length;
    arrive();
    frame(10000);
    assert.equal(calls.length, before); // A stalled download must not consume the new fade.
    frame(10100);
    assert.equal(content.revealing, true);
    options.on_status("content_ready");
    complete();
    await pending;
    frame(10200);
    assert.ok(calls.includes("animate"));
    runtime.dispose();
    assert.equal(frames.size, 0);
  });

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
      PLAY_GRASS_VARIANT: { role_groups: { walking_insects: "bugs" } },
      visible_play_traversal_starts: () => [0.3, 0.6],
      random_play_traversal_start: ({ candidates }) => candidates[0],
      PLAY_GRASS_RELEASE: {
        key: "grass-strip",
        release: "a".repeat(64),
        variant: "ladybug-zoomies",
      },
      play_grass_variant_document: (document, revision, key) => {
        assert.equal(revision, 17);
        assert.equal(key, "ladybug-zoomies");
        calls.push("zoomies");
        return document;
      },
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
        assert.equal(options.start_fraction, 0.3);
        calls.push("create");
        return {
          release_introduction() {},
          resize: (w, h) => calls.push([w, h]),
          update: (doc) => calls.push(doc),
          dispose: () => calls.push("dispose"),
        };
      },
    });
    module.exports.default({ width_px: 1200, height_px: 700 });
    effects[0]();
    const cleanup = effects[1]();
    effects[2]();
    if (cancel_first) cleanup();
    const document = { id: "base-strip" };
    complete({ document, source_revision: 17 });
    await promise;
    await new Promise((resolve) => setImmediate(resolve));
    if (cancel_first) {
      assert.equal(signal.aborted, true);
      assert.equal(calls.includes("create"), false);
    } else {
      assert.ok(calls.includes(document));
      assert.ok(calls.includes("zoomies"));
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
