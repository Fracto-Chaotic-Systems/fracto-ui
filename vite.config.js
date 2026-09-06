import { defineConfig } from "vite";
import plugin from "@vitejs/plugin-react";
import { FRACTO_UI_PORT } from "../../constants.js";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [plugin()],
  server: {
    port: FRACTO_UI_PORT,
    host: true,
  },
  define: {
    "process.env": {}, // this provides an empty object for process.env references
    // You might need to add a full polyfill if the library uses more than just process.env
  },
});
