import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import {
  scan_crt_screen_media,
  crt_screen_media_plugin,
} from "../scripts/crt_screen_media_plugin.js";
import { create_crt_playlist } from "../src/pages/games/CrtScreenPlaylist.js";

const media = [
  { type: "image", source: "/screens/a.jpg" },
  { type: "video", source: "/screens/b.mp4" },
  { type: "image", source: "/screens/c.jpg" },
];

test("Image3 receives a slow face-to-full-image reveal", () => {
  const playlist = create_crt_playlist(
    [{ type: "image", source: "/screens/Image3.jpg" }],
    { random: () => 0 },
  );
  playlist.advance(3);
  const layer = playlist.content.layers[0];
  assert.deepEqual(layer.zoom_out, { x: 0.4, y: 0.2, width: 0.25 });
  assert.equal(layer.pan_duration, 18);
  playlist.advance(15);
  assert.equal(playlist.content.layers[0], layer);
});

test("playlist covers every file, avoids boundary repeats, and inserts face interludes", () => {
  let seed = 13;
  const playlist = create_crt_playlist(media, {
    random: () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    },
  });
  const selected = [],
    durations = [];
  assert.equal(playlist.content.layers[0].type, "face");
  for (let i = 0; i < 12; i++) {
    assert.equal(playlist.content.layers[0].type, "face");
    const next = playlist.advance(playlist.remaining + 0.000001);
    const item = next.layers[0];
    selected.push(item.source);
    durations.push(playlist.remaining);
    assert.equal(item.fit, "contain");
    assert.equal(item.loop, true);
    if (item.type === "video")
      assert.ok(playlist.remaining >= 7.999 && playlist.remaining <= 14);
    else {
      assert.ok(playlist.remaining >= 8.999 && playlist.remaining <= 17);
      assert.ok(Math.abs(item.pan_duration - playlist.remaining) < 0.00001);
    }
    playlist.advance(playlist.remaining + 0.000001);
  }
  for (let i = 0; i < selected.length; i += media.length)
    assert.equal(
      new Set(selected.slice(i, i + media.length)).size,
      media.length,
    );
  for (let i = 1; i < selected.length; i++)
    assert.notEqual(selected[i], selected[i - 1]);
  assert.ok(new Set(durations.map((value) => value.toFixed(3))).size > 3);
});

test("playlist holds its current frame under reduced motion and tolerates empty/duplicate catalogs", () => {
  const empty = create_crt_playlist([]);
  assert.equal(empty.advance(60).layers[0].type, "face");
  const playlist = create_crt_playlist(
    [media[0], media[0], { type: "static" }],
    { random: () => 0 },
  );
  const content = playlist.content,
    remaining = playlist.remaining;
  assert.equal(playlist.advance(60, false), content);
  assert.equal(playlist.remaining, remaining);
  playlist.advance(remaining + 0.001);
  assert.equal(playlist.content.layers[0].source, media[0].source);
  playlist.advance(playlist.remaining + 0.001);
  playlist.advance(playlist.remaining + 0.001);
  assert.equal(playlist.content.layers[0].source, media[0].source);
});

function directory(t) {
  const root = mkdtempSync(path.join(tmpdir(), "fracto-crt-media-"));
  assert.equal(path.dirname(root), path.resolve(tmpdir()));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test("media catalog includes browser images and MP4s with encoded public URLs only", (t) => {
  const root = directory(t);
  for (const name of [
    "Poster 1.jpg",
    "Movie.MP4",
    "a#b.png",
    "README.md",
    "legacy.avi",
  ])
    writeFileSync(path.join(root, name), "");
  mkdirSync(path.join(root, "folder.jpg"));
  assert.deepEqual(scan_crt_screen_media(root), [
    { type: "video", source: "/screens/Movie.MP4" },
    { type: "image", source: "/screens/Poster%201.jpg" },
    { type: "image", source: "/screens/a%23b.png" },
  ]);
  assert.deepEqual(scan_crt_screen_media(path.join(root, "absent")), []);
});

test("browser-compatible copies replace legacy MP4s without duplicate playlist entries", (t) => {
  const root = directory(t);
  for (const name of ["clip.mp4", "clip.browser.mp4", "Other.MP4"])
    writeFileSync(path.join(root, name), "");
  const catalog = scan_crt_screen_media(root);
  assert.equal(catalog.length, 2);
  assert.ok(
    catalog.some((item) => item.source === "/screens/clip.browser.mp4"),
  );
  assert.ok(!catalog.some((item) => item.source === "/screens/clip.mp4"));
});

test("Vite catalog updates on add/remove and unregisters its watcher on close", (t) => {
  const root = directory(t),
    screens = path.join(root, "screens");
  mkdirSync(screens);
  const plugin = crt_screen_media_plugin(),
    watcher = new EventEmitter(),
    httpServer = new EventEmitter(),
    sent = [],
    invalidated = [];
  const module = {};
  watcher.add = () => {};
  plugin.configResolved({ publicDir: root });
  const id = plugin.resolveId("virtual:crt-screen-media");
  plugin.configureServer({
    watcher,
    httpServer,
    ws: { send: (value) => sent.push(value) },
    moduleGraph: {
      getModuleById: () => module,
      invalidateModule: (value) => invalidated.push(value),
    },
  });
  writeFileSync(path.join(screens, "new.mp4"), "");
  watcher.emit("add", path.join(screens, "new.mp4"));
  assert.equal(sent.length, 1);
  assert.equal(invalidated[0], module);
  assert.ok(plugin.load(id).includes("/screens/new.mp4"));
  watcher.emit("add", path.join(screens, "notes.md"));
  assert.equal(sent.length, 1);
  unlinkSync(path.join(screens, "new.mp4"));
  watcher.emit("unlink", path.join(screens, "new.mp4"));
  assert.equal(sent.length, 2);
  assert.ok(!plugin.load(id).includes("/screens/new.mp4"));
  httpServer.emit("close");
  assert.equal(watcher.listenerCount("add"), 0);
  assert.equal(watcher.listenerCount("unlink"), 0);
});

test("catalog polling detects new files when filesystem events are missed", (t) => {
  const root = directory(t),
    screens = path.join(root, "screens");
  mkdirSync(screens);
  let poll,
    stopped = false;
  const token = {},
    sent = [],
    watcher = new EventEmitter(),
    httpServer = new EventEmitter();
  watcher.add = () => {};
  const plugin = crt_screen_media_plugin({
    schedule(callback, interval) {
      assert.equal(interval, 3000);
      poll = callback;
      return token;
    },
    unschedule(timer) {
      assert.equal(timer, token);
      stopped = true;
    },
  });
  plugin.configResolved({ publicDir: root });
  plugin.configureServer({
    watcher,
    httpServer,
    moduleGraph: { getModuleById: () => undefined },
    ws: { send: (message) => sent.push(message) },
  });
  writeFileSync(path.join(screens, "pong.mp4"), "");
  poll();
  assert.equal(sent.length, 1);
  assert.ok(
    plugin
      .load(plugin.resolveId("virtual:crt-screen-media"))
      .includes("/screens/pong.mp4"),
  );
  poll();
  assert.equal(sent.length, 1, "unchanged catalogs do not reload the game");
  httpServer.emit("close");
  assert.equal(stopped, true);
});
