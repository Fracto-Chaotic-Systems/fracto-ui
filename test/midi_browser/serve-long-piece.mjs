import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { build } from "vite";
import { create_instrument_router } from "../../../fracto-asset-server/handlers/instruments.js";
const require = createRequire(
  new URL("../../../fracto-asset-server/package.json", import.meta.url),
);
const app = require("express")();
app.use("/api/asset/instruments", create_instrument_router({ public_url: "" }));
const directory = path.dirname(fileURLToPath(import.meta.url));
const [output, midi] = process.argv
  .slice(2)
  .map((value) => path.resolve(value));
if (!output || !midi)
  throw new Error("Supply an output directory and local MIDI file");
const midi_bytes = await fs.readFile(midi);
const fixture = {
  name: path.basename(midi),
  bytes: midi_bytes.length,
  sha256: createHash("sha256").update(midi_bytes).digest("hex"),
};
await fs.mkdir(output, { recursive: true });
const dist = path.join(output, "long-piece-dist");
await build({
  root: directory,
  configFile: path.resolve(directory, "../../vite.config.js"),
  build: {
    outDir: dist,
    emptyOutDir: true,
    rollupOptions: { input: path.join(directory, "long-piece.html") },
  },
});
http
  .createServer(async (req, res) => {
    try {
      if (req.url.startsWith("/api/asset/instruments")) return app(req, res);
      if (req.url === "/target-midi") {
        res.setHeader("Content-Type", "audio/midi");
        return res.end(midi_bytes);
      }
      if (req.url === "/long-piece-report" && req.method === "POST") {
        const chunks = [];
        let bytes = 0;
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 1024 * 1024) throw new Error("Report too large");
          chunks.push(chunk);
        }
        const report = {
          fixture,
          ...JSON.parse(Buffer.concat(chunks).toString("utf8")),
        };
        await fs.writeFile(
          path.join(output, "hammerklavier-playback.json"),
          JSON.stringify(report, null, 2),
        );
        return res.end("saved");
      }
      const filename = path.resolve(
        dist,
        "." + (req.url === "/" ? "/long-piece.html" : req.url),
      );
      if (!filename.startsWith(dist + path.sep))
        return res.writeHead(403).end();
      res.setHeader(
        "Content-Type",
        filename.endsWith(".js") ? "text/javascript" : "text/html",
      );
      res.end(await fs.readFile(filename));
    } catch (error) {
      res.writeHead(500).end(error.message);
    }
  })
  .listen(43192, "127.0.0.1", () =>
    console.log("Long-piece verification: http://127.0.0.1:43192"),
  );
