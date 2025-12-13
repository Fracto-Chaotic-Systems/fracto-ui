import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';
import {FRACTO_UI_PORT} from "../../constants.js";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [plugin()],
    server: {
        port: FRACTO_UI_PORT,
    }
})