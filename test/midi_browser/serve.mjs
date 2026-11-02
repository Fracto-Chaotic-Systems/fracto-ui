import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
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
      if (req.method === "POST" && ["/report", "/audio"].includes(req.url)) {
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
            req.url === "/report" ? "browser-results.json" : "playback.wav",
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
