import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { setInterval, clearInterval } from "node:timers";

const MODULE_ID = "virtual:crt-screen-media";
const RESOLVED_ID = `\0${MODULE_ID}`;
const IMAGE = /\.(?:jpe?g|png|webp|avif|gif|bmp|svg)$/i;
const supported = (name) => IMAGE.test(name) || /\.mp4$/i.test(name);

export function scan_crt_screen_media(directory) {
  if (!existsSync(directory)) return [];
  const entries = readdirSync(directory, { withFileTypes: true });
  const replaced = new Set(
    entries
      .filter((entry) => entry.isFile() && /\.browser\.mp4$/i.test(entry.name))
      .map((entry) =>
        entry.name.replace(/\.browser\.mp4$/i, ".mp4").toLowerCase(),
      ),
  );
  return entries
    .filter((entry) => entry.isFile() && supported(entry.name))
    .filter((entry) => !replaced.has(entry.name.toLowerCase()))
    .map((entry) => ({
      type: IMAGE.test(entry.name) ? "image" : "video",
      source: `/screens/${encodeURIComponent(entry.name)}`,
    }))
    .sort((a, b) => (a.source < b.source ? -1 : a.source > b.source ? 1 : 0));
}

// Public files stay public URLs; importing them as bundled assets is unsupported
// by Vite. This virtual module only supplies the directory's media catalog.
export function crt_screen_media_plugin({
  schedule = setInterval,
  unschedule = clearInterval,
} = {}) {
  let directory;
  return {
    name: "fracto-crt-screen-media",
    configResolved(config) {
      directory = path.resolve(config.publicDir, "screens");
    },
    resolveId(id) {
      if (id === MODULE_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID)
        return `export default ${JSON.stringify(scan_crt_screen_media(directory))};`;
    },
    configureServer(server) {
      server.watcher.add(directory);
      let signature = JSON.stringify(scan_crt_screen_media(directory));
      const check_catalog = () => {
        const next = JSON.stringify(scan_crt_screen_media(directory));
        if (next === signature) return;
        signature = next;
        const module = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: "full-reload" });
      };
      const refresh = (filename) => {
        if (
          path.dirname(path.resolve(filename)) === directory &&
          supported(filename)
        )
          check_catalog();
      };
      // Windows bind mounts can miss add/unlink events inside the dev container.
      const timer = schedule(check_catalog, 3000);
      timer?.unref?.();
      server.watcher.on("add", refresh).on("unlink", refresh);
      server.httpServer?.once("close", () => {
        unschedule(timer);
        server.watcher.off("add", refresh).off("unlink", refresh);
      });
    },
  };
}
