import { normalize_server_url } from "./AdminServersUtils.js";

const escape_markdown_value = (value) =>
  String(value ?? "unavailable")
    .replace(/\\/g, "\\\\")
    .replace(/([`*_{}\x5B\x5D()#+.!|>])/g, "\\$1")
    .replace(/[\r\n]+/g, " ");

export const render_server_template = (template, values) =>
  template.replace(/\{\{([a-z0-9_.-]+)\}\}/gi, (token, path) => {
    const value = path
      .split(".")
      .reduce((current, key) => current?.[key], values);
    const label = escape_markdown_value(
      value ?? values?.text?.unavailable ?? "unavailable",
    );
    if (
      ["server.started_at", "server.checked_at"].includes(path) &&
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T/.test(value)
    ) {
      const date = new Date(value);
      if (Number.isFinite(date.getTime())) {
        const iso = date.toISOString();
        return `[${iso}](#server-time/${iso})`;
      }
    }
    if (path === "server.public_url") {
      const url = normalize_server_url(value);
      if (url) return `[${label}](<${url}>)`;
    }
    return label;
  });
