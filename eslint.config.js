import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", ".archive"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      "no-unused-vars": "off",
      "no-case-declarations": "warn",
      "no-control-regex": "warn",
      "no-debugger": "warn",
      "no-dupe-else-if": "warn",
      "no-undef": "warn",
      "no-useless-escape": "warn",
      // This project intentionally colocates reusable helpers and constants with
      // components, so the Vite preset's component-only export rule is not a fit.
      "react-refresh/only-export-components": "off",
    },
  },
]);
