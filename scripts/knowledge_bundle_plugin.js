import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { setTimeout, clearTimeout } from "node:timers";

const ui_root = path.resolve(import.meta.dirname, "..");
const main_root = path.resolve(ui_root, "../..");
const build_sources = new Set([
  path.join(main_root, "scripts/build_knowledge_bundle.js"),
  ...[
    "ui.json",
    "bundle.js",
    "bundle_sources.js",
    "bundle_contract.js",
    "bundle_output.js",
    "contracts.js",
    "validation.js",
  ].map((file) =>
    path.join(main_root, "servers/fracto-ai-server/subject_providers", file),
  ),
]);

/** Debounce source events and serialize fresh-process builds; never overlap writers. */
export const create_bundle_rebuilder = ({
  run,
  report = () => {},
  schedule = setTimeout,
  unschedule = clearTimeout,
}) => {
  let pending = false,
    busy = false,
    stopped = false,
    timer,
    child;
  const drain = () => {
    timer = undefined;
    if (stopped || busy || !pending) return;
    pending = false;
    busy = true;
    let settled = false;
    const done = (error) => {
      if (settled) return;
      settled = true;
      busy = false;
      child = undefined;
      if (stopped) return;
      report(Boolean(error));
      if (pending) request();
    };
    try {
      child = run(done);
      if (settled) child = undefined;
    } catch (error) {
      done(error);
    }
  };
  const request = () => {
    if (stopped) return;
    pending = true;
    if (timer !== undefined) unschedule(timer);
    timer = schedule(drain, 300);
  };
  const close = () => {
    if (stopped) return;
    stopped = true;
    if (timer !== undefined) unschedule(timer);
    child?.kill();
  };
  return { request, close };
};

export const relevant_bundle_source = (filename) => {
  if (build_sources.has(path.resolve(filename))) return true;
  const relative = path
    .relative(ui_root, path.resolve(filename))
    .replaceAll("\\", "/");
  return (
    !relative.startsWith("../") &&
    !path.isAbsolute(relative) &&
    ((relative.startsWith("src/") && /\.(?:jsx?|tsx?|json)$/.test(relative)) ||
      /^scripts\/(?:check_feature_catalog|catalog_navigation|catalog_source_facts)\.js$/.test(
        relative,
      ))
  );
};

/** Vite development only. Production uses the existing npm prebuild hook. */
export const knowledge_bundle_plugin = () => {
  let stop;
  return {
    name: "fracto-knowledge-bundle",
    apply: "serve",
    configureServer(server) {
      stop?.();
      const builder = create_bundle_rebuilder({
        run: (done) =>
          execFile(
            process.execPath,
            [path.join(main_root, "scripts/build_knowledge_bundle.js")],
            {
              cwd: main_root,
              windowsHide: true,
              timeout: 30000,
              maxBuffer: 16384,
            },
            (error) => done(error),
          ),
        report: (failed) => {
          if (failed)
            server.config.logger.error(
              "App-reference bundle validation failed; the previous bundle was retained. Run npm run check:catalog for details.",
            );
        },
      });
      const change = (event, filename) => {
        if (
          ["add", "change", "unlink"].includes(event) &&
          relevant_bundle_source(filename)
        )
          builder.request();
      };
      server.watcher.add([...build_sources]);
      server.watcher.on("all", change);
      builder.request();
      stop = () => {
        server.watcher.off("all", change);
        builder.close();
      };
    },
    closeBundle() {
      stop?.();
    },
  };
};
