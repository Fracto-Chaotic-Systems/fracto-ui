import { createRequire } from "node:module";
import { create_instrument_router } from "../../../fracto-asset-server/handlers/instruments.js";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
const require = createRequire(
  new URL("../../../fracto-asset-server/package.json", import.meta.url),
);
const asset_app = require("express")();
asset_app.use(
  "/api/asset/instruments",
  create_instrument_router({ public_url: "" }),
);
const directory = path.dirname(fileURLToPath(import.meta.url));
if (!process.argv[2] || !path.isAbsolute(process.argv[2]))
  throw new Error("Supply an absolute output directory.");
const output = path.resolve(process.argv[2]);
const dist = path.join(output, "browser-dist");
await fs.mkdir(output, { recursive: true });
await build({
  root: directory,
  configFile: path.resolve(directory, "../../vite.config.js"),
  build: { outDir: dist, emptyOutDir: true },
});
await fs.copyFile(
  path.join(directory, "capture-worklet.js"),
  path.join(dist, "capture-worklet.js"),
);
http
  .createServer(async (req, res) => {
    try {
      if (req.url === "/api/admin/ports") {
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            ports: {
              main: 3001,
              data: 3002,
              asset: 3003,
              tiles: 3004,
              admin: 3005,
            },
          }),
        );
        return;
      }
      if (req.url.startsWith("/api/asset/instruments")) {
        asset_app(req, res);
        return;
      }
      if (
        req.method === "POST" &&
        [
          "/report",
          "/audio",
          "/mixer_audio",
          "/fluid_representatives",
          "/fluid_complete",
          "/fluid_audition",
          "/standard_report",
          "/standard_audio",
          "/percussion_report",
          "/kit_assignment_report",
          "/percussion_audio",
          "/library_report",
          "/asset_report",
          "/asset_audio",
        ].includes(req.url)
      ) {
        let length = 0;
        const chunks = [];
        for await (const chunk of req) {
          length += chunk.length;
          if (length > 32 * 1024 * 1024) throw new Error("Capture too large");
          chunks.push(chunk);
        }
        await fs.writeFile(
          path.join(
            output,
            {
              "/report": "browser-results.json",
              "/audio": "playback.wav",
              "/mixer_audio": "mixer-playback.wav",
              "/fluid_representatives": "fluidr3-representatives.json",
              "/fluid_complete": "fluidr3-complete.json",
              "/fluid_audition": "fluidr3-ab-audition.wav",
              "/standard_report": "standard-browser-verification.json",
              "/standard_audio": "standard-realtime.wav",
              "/percussion_report": "percussion-playback.json",
              "/kit_assignment_report": "kit-assignment.json",
              "/percussion_audio": "percussion-playback.wav",
              "/library_report": "library-browser-results.json",
              "/asset_report": "asset-engine-results.json",
              "/asset_audio": "asset-engine-playback.wav",
            }[req.url],
          ),
          Buffer.concat(chunks),
        );
        res.end("saved");
        return;
      }
      const filename = path.resolve(
        dist,
        `.` + (req.url === "/" ? "/index.html" : req.url),
      );
      if (!filename.startsWith(dist + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      res.setHeader(
        "Content-Type",
        filename.endsWith(".js") ? "text/javascript" : "text/html",
      );
      res.end(await fs.readFile(filename));
    } catch (error) {
      res.writeHead(500).end(error.message);
    }
  })
  .listen(43191, "127.0.0.1", () =>
    console.log("MIDI verification: http://127.0.0.1:43191"),
  );
