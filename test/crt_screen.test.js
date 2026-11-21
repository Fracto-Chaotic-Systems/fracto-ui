import test from "node:test";
import assert from "node:assert/strict";
import { create_crt_interference } from "../src/pages/games/CrtScreenEffects.js";
import {
  crt_media_rect,
  crt_portrait_rect,
  prepare_crt_media,
} from "../src/pages/games/CrtScreenMedia.js";
import { create_crt_screen } from "../src/pages/games/CrtScreen.js";
import { crt_image_reveal_rect } from "../src/pages/games/CrtImageReveal.js";

test("image reveal starts on the upper face and finishes with the whole image", () => {
  const focus = { x: 0.4, y: 0.2, width: 0.25 };
  const rect = (time, reduced = false) =>
    crt_image_reveal_rect(1500, 896, 512, 384, focus, time, 20, reduced);
  const start = rect(0),
    middle = rect(10),
    end = rect(18);
  assert.ok(Math.abs(start.x + start.width * focus.x - 256) < 1e-9);
  assert.ok(Math.abs(start.y + start.height * focus.y - 192) < 1e-9);
  assert.ok(start.width > middle.width && middle.width > end.width);
  assert.deepEqual(end, crt_media_rect(1500, 896, 512, 384));
  assert.deepEqual(rect(0, true), end);
  assert.deepEqual(rect(30), end);
});

function drawing_context() {
  const calls = [],
    stack = [];
  const ctx = {
    calls,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    save() {
      stack.push([this.globalAlpha, this.globalCompositeOperation]);
    },
    restore() {
      [this.globalAlpha, this.globalCompositeOperation] = stack.pop();
    },
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  for (const method of [
    "clearRect",
    "fillRect",
    "translate",
    "scale",
    "beginPath",
    "rect",
    "clip",
    "roundRect",
    "fill",
    "arc",
    "stroke",
    "putImageData",
    "drawImage",
  ]) {
    ctx[method] = (...args) =>
      calls.push({
        method,
        args,
        alpha: ctx.globalAlpha,
        blend: ctx.globalCompositeOperation,
      });
  }
  return ctx;
}

function media_element(type) {
  const source = new EventTarget();
  Object.assign(source, {
    width: 320,
    height: 240,
    complete: true,
    readyState: 2,
    videoWidth: type === "video" ? 640 : 0,
    videoHeight: type === "video" ? 360 : 0,
    plays: 0,
    pauses: 0,
    loads: 0,
    play() {
      this.plays++;
      return Promise.resolve();
    },
    pause() {
      this.pauses++;
    },
    load() {
      this.loads++;
    },
    removeAttribute(key) {
      delete this[key];
    },
  });
  return source;
}

function environment() {
  const elements = [],
    contexts = [];
  const doc = {
    createElement(type) {
      if (type !== "canvas") {
        const element = media_element(type);
        elements.push(element);
        return element;
      }
      const ctx = drawing_context();
      contexts.push(ctx);
      return {
        width: 512,
        height: 384,
        ownerDocument: doc,
        getContext: () => ctx,
      };
    },
  };
  const canvas = doc.createElement("canvas");
  return { canvas, ctx: contexts[0], doc, elements, contexts };
}

test("interference alternates brief static and face at irregular bounded intervals", () => {
  const values = [0, 0.2, 0.9, 0.6, 0.35, 0.8];
  let index = 0;
  const schedule = create_crt_interference({
    random: () => values[index++ % values.length],
  });
  const faces = [],
    bursts = [];
  for (let cycle = 0; cycle < 6; cycle++) {
    const face = schedule.state.remaining;
    faces.push(face);
    // Remaining time carries the preceding sample's small boundary overshoot.
    assert.ok(face >= 3.398 && face <= 7.8);
    assert.equal(schedule.advance(face - 0.001), false);
    assert.equal(schedule.advance(0.002), true);
    const burst = schedule.state.remaining;
    bursts.push(burst);
    assert.ok(burst >= 0.219 && burst <= 0.68);
    assert.equal(schedule.advance(burst + 0.001), false);
  }
  assert.ok(new Set(faces.map((value) => value.toFixed(2))).size > 1);
  assert.ok(new Set(bursts.map((value) => value.toFixed(2))).size > 1);
  schedule.advance(schedule.state.remaining + 0.001);
  assert.equal(schedule.advance(0, false), false);
  assert.equal(schedule.advance(0), false);
});

test("image and video sizing preserves aspect ratio for contain and cover", () => {
  assert.deepEqual(crt_media_rect(1280, 720, 512, 384), {
    x: 0,
    y: 48,
    width: 512,
    height: 288,
  });
  assert.deepEqual(crt_media_rect(800, 1200, 512, 384), {
    x: 128,
    y: 0,
    width: 256,
    height: 384,
  });
  const cover = crt_media_rect(1280, 720, 512, 384, "cover");
  assert.ok(Math.abs(cover.width / cover.height - 1280 / 720) < 1e-10);
  assert.ok(cover.x < 0 && cover.y === 0 && cover.height === 384);
  assert.equal(crt_media_rect(0, 0, 512, 384), null);
});

test("portrait images fill the screen, hold the top, then ease to the bottom without distortion", () => {
  for (const [width, height] of [
    [600, 1200],
    [900, 1000],
    [300, 2400],
  ]) {
    const start = crt_portrait_rect(width, height, 512, 384, 0, 6);
    const held = crt_portrait_rect(width, height, 512, 384, 0.5, 6);
    const middle = crt_portrait_rect(width, height, 512, 384, 3, 6);
    const end = crt_portrait_rect(width, height, 512, 384, 5.5, 6);
    assert.equal(start.y, 0);
    assert.equal(held.y, 0);
    assert.ok(start.width >= 512 && start.height >= 768);
    assert.ok(Math.abs(start.width / start.height - width / height) < 1e-10);
    assert.ok(middle.y < start.y && middle.y > end.y);
    assert.ok(Math.abs(end.y + end.height - 384) < 1e-10);
    assert.deepEqual(crt_portrait_rect(width, height, 512, 384, 20, 6), end);
    assert.deepEqual(
      crt_portrait_rect(width, height, 512, 384, 5.5, 6, true),
      start,
    );
  }
});

test("portrait media uses content-local time, supports opt-out, and leaves portrait videos unchanged", () => {
  const env = environment(),
    source = media_element("img");
  source.width = 600;
  source.height = 1200;
  const options = {
    canvas_document: env.doc,
    on_ready() {},
    on_error(error) {
      throw error;
    },
  };
  const media = prepare_crt_media(
    { type: "image", source, pan_duration: 5 },
    options,
  );
  const frame = { width: 512, height: 384, time: 80, content_time: 0 };
  media.draw(env.ctx, frame);
  let draw = env.ctx.calls.filter((call) => call.method === "drawImage").at(-1);
  assert.equal(
    draw.args[2],
    0,
    "new image starts at the top despite the global clock",
  );
  media.draw(env.ctx, { ...frame, content_time: 4.5 });
  draw = env.ctx.calls.filter((call) => call.method === "drawImage").at(-1);
  assert.ok(Math.abs(draw.args[2] + draw.args[4] - 384) < 1e-10);
  media.dispose();
  const still = prepare_crt_media(
    { type: "image", source, portrait_pan: false },
    options,
  );
  still.draw(env.ctx, frame);
  draw = env.ctx.calls.filter((call) => call.method === "drawImage").at(-1);
  assert.equal(draw.args[3], 192);
  assert.equal(draw.args[4], 384);
  still.dispose();
  const video = media_element("video");
  video.videoWidth = 600;
  video.videoHeight = 1200;
  const playback = prepare_crt_media({ type: "video", source: video }, options);
  playback.draw(env.ctx, frame);
  draw = env.ctx.calls.filter((call) => call.method === "drawImage").at(-1);
  assert.equal(draw.args[3], 192);
  assert.equal(draw.args[4], 384);
  playback.dispose();
});

test("image, video, animation and static layers share the same canvas and ordered transforms", () => {
  const env = environment(),
    frames = [],
    source = media_element("img"),
    video = media_element("video");
  const display = create_crt_screen(env.canvas);
  display.set_content({
    layers: [
      { type: "image", source },
      {
        type: "video",
        source: video,
        rect: { x: 0.25, y: 0.25, width: 0.5, height: 0.25 },
      },
      {
        type: "animation",
        opacity: 0.6,
        blend: "screen",
        draw(ctx, frame) {
          frames.push({
            ctx,
            frame,
            alpha: ctx.globalAlpha,
            blend: ctx.globalCompositeOperation,
          });
        },
      },
      { type: "static", opacity: 0.1 },
    ],
  });
  assert.equal(
    display.paint({ dt: 0.04, pointer: { x: 0.7, y: -0.2 } }),
    "content",
  );
  const images = env.ctx.calls.filter((call) => call.method === "drawImage");
  assert.equal(images[0].args[0], source);
  assert.equal(images[1].args[0], video);
  assert.equal(images[2].alpha, 0.1);
  assert.ok(
    env.ctx.calls.some(
      (call) =>
        call.method === "translate" &&
        call.args[0] === 128 &&
        call.args[1] === 96,
    ),
  );
  assert.ok(
    env.ctx.calls.some(
      (call) =>
        call.method === "rect" && call.args[2] === 256 && call.args[3] === 96,
    ),
  );
  assert.ok(
    Math.abs(images[1].args[3] / images[1].args[4] - 640 / 360) < 1e-10,
  );
  assert.equal(images[1].args[4], 96);
  assert.equal(frames[0].ctx, env.ctx);
  assert.equal(frames[0].alpha, 0.6);
  assert.equal(frames[0].blend, "screen");
  assert.equal(frames[0].frame.width, 512);
  assert.equal(frames[0].frame.time, 0.04);
  assert.deepEqual(frames[0].frame.pointer, { x: 0.7, y: -0.2 });
  display.dispose();
  assert.equal(display.paint(), "disposed");
  assert.equal(video.pauses, 0, "caller-owned video playback is unchanged");
});

test("the default face returns after static and reduced motion suppresses interruptions", () => {
  const env = environment(),
    display = create_crt_screen(env.canvas, { random: () => 0 });
  assert.equal(display.paint(), "face");
  for (let i = 0; i < 33; i++) display.paint({ dt: 0.1 });
  assert.equal(display.paint({ dt: 0.11 }), "static");
  assert.equal(display.paint({ dt: 0.3 }), "face");
  for (let i = 0; i < 150; i++)
    assert.equal(display.paint({ dt: 0.1, reduced_motion: true }), "face");
  display.dispose();
});

test("selecting a portrait resets its pan independently of the running screen clock", () => {
  const env = environment(),
    source = media_element("img");
  source.width = 600;
  source.height = 1200;
  const display = create_crt_screen(env.canvas);
  const content = () => ({
    layers: [{ type: "image", source, pan_duration: 4.5 }],
  });
  display.set_content(content());
  for (let i = 0; i < 45; i++) display.paint({ dt: 0.1 });
  let draw = env.ctx.calls
    .filter((call) => call.method === "drawImage" && call.args[0] === source)
    .at(-1);
  assert.ok(Math.abs(draw.args[2] + draw.args[4] - 384) < 1e-10);
  display.set_content(content());
  display.paint({ dt: 0.04 });
  draw = env.ctx.calls
    .filter((call) => call.method === "drawImage" && call.args[0] === source)
    .at(-1);
  assert.equal(draw.args[2], 0);
  display.dispose();
});

test("owned video pauses, resumes and releases its URL when content changes", () => {
  const env = environment();
  let ready = 0;
  const display = create_crt_screen(env.canvas, { on_ready: () => ready++ });
  display.set_content({ layers: [{ type: "video", source: "/intro.webm" }] });
  const video = env.elements[0];
  assert.equal(video.crossOrigin, "anonymous");
  assert.equal(video.muted, true);
  assert.equal(video.plays, 1);
  display.set_active(false);
  assert.equal(video.pauses, 1);
  display.set_active(true);
  assert.equal(video.plays, 2);
  video.dispatchEvent(new Event("loadeddata"));
  assert.equal(ready, 1);
  display.set_content({ layers: [{ type: "face" }] });
  assert.equal(video.pauses, 2);
  assert.equal(video.loads, 1);
  assert.equal(video.src, undefined);
  video.dispatchEvent(new Event("loadeddata"));
  assert.equal(ready, 1);
  display.dispose();
});

test("unready media and a failing animation fall back to the face without breaking painting", () => {
  const env = environment(),
    errors = [],
    image = media_element("img");
  image.complete = false;
  const display = create_crt_screen(env.canvas, {
    on_error: (error) => errors.push(error),
  });
  display.set_content({
    layers: [
      { type: "image", source: image },
      {
        type: "animation",
        draw() {
          throw new Error("bad frame");
        },
      },
    ],
  });
  display.paint();
  display.paint();
  assert.equal(errors.length, 1);
  assert.ok(
    env.ctx.calls.some((call) => call.method === "roundRect"),
    "face fallback was drawn",
  );
  display.dispose();
});

test("cross-origin media is rejected before drawing to the shared texture", () => {
  const env = environment(),
    errors = [],
    target = drawing_context();
  env.doc.createElement = () => ({
    getContext: () => ({
      drawImage() {},
      getImageData() {
        throw new Error("tainted source");
      },
    }),
  });
  const media = prepare_crt_media(
    { type: "image", source: media_element("img") },
    {
      canvas_document: env.doc,
      on_ready() {},
      on_error: (error) => errors.push(error),
    },
  );
  assert.equal(media.draw(target, { width: 512, height: 384 }), false);
  assert.equal(media.draw(target, { width: 512, height: 384 }), false);
  assert.equal(errors.length, 1);
  assert.equal(target.calls.length, 0);
  media.dispose();
});

test("playlist replaces and releases media while explicit game content overrides rotation", () => {
  const env = environment(),
    display = create_crt_screen(env.canvas, { random: () => 0 });
  display.set_content({
    playlist: [
      { type: "image", source: "/still.jpg" },
      { type: "video", source: "/clip.mp4" },
    ],
  });
  display.paint({ dt: 3 });
  assert.equal(display.source, "/still.jpg");
  const image = env.elements[0];
  display.paint({ dt: 9 });
  assert.equal(display.source, "");
  assert.equal(image.src, undefined);
  display.paint({ dt: 3 });
  assert.equal(display.source, "/clip.mp4");
  const video = env.elements[1];
  assert.equal(video.plays, 1);
  display.set_content({ layers: [{ type: "face" }] });
  assert.equal(video.pauses, 1);
  assert.equal(video.loads, 1);
  assert.equal(display.paint({ dt: 60 }), "face");
  assert.equal(display.source, "");
  display.dispose();
});
