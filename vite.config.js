import { defineConfig } from "vite";
import plugin from "@vitejs/plugin-react";
import { FRACTO_UI_PORT } from "../../constants.js";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [plugin()],
  // The development container runs Vite as the `node` user while dependency
  // volumes are populated from root-owned image layers. Keep the optimizer
  // cache writable in development; production builds retain the default cache
  // location inside node_modules.
  cacheDir:
    process.env.FRACTO_WATCH === "true"
      ? "/tmp/fracto-vite-cache"
      : "node_modules/.vite",
  resolve: {
    // Ensure tree-library dependencies resolve to the application React
    // instance rather than creating a second optimized React copy.
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: FRACTO_UI_PORT,
    host: true,
  },
  define: {
    "process.env": {}, // this provides an empty object for process.env references
    // You might need to add a full polyfill if the library uses more than just process.env
  },
});
