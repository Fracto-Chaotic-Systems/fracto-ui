import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import {
  server_times,
  format_server_uptime,
} from "../src/pages/admin/AdminServerTimes.js";
import { render_server_template } from "../src/pages/admin/AdminServersTemplate.js";

test("server timestamps use the check time and uptime, and reject missing dates", () => {
  const checked = new Date("2026-10-21T15:00:00Z");
  assert.deepEqual(server_times({ uptime_seconds: 3600 }, checked), {
    checked_at: "2026-10-21T15:00:00.000Z",
    started_at: "2026-10-21T14:00:00.000Z",
  });
  for (const uptime_seconds of [undefined, null, -1, Infinity, "bad"])
    assert.equal(server_times({ uptime_seconds }, checked).started_at, null);
  assert.deepEqual(server_times({ uptime_seconds: 1 }, null), {
    checked_at: null,
    started_at: null,
  });
  assert.equal(
    server_times({ uptime_seconds: 0 }, checked).started_at,
    checked.toISOString(),
  );
});

test("timestamp template markers render relative text with the exact local date on hover", () => {
  const source = readFileSync(
    new URL("../src/pages/admin/AdminServerTime.jsx", import.meta.url),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace(
      "export default function AdminServerTime",
      "function AdminServerTime",
    );
  const Link = runInNewContext(
    transformSync(source, { loader: "jsx" }).code + ";AdminServerTime",
    {
      React,
      PropTypes: { string: {}, node: {} },
      TimeAgo: { locale: () => {} },
      en: {},
      MarkdownStyles: { Link: "a" },
      ReactTimeAgo: ({ date, tooltip }) => {
        assert.equal(tooltip, false);
        return React.createElement(
          "time",
          { dateTime: date.toISOString() },
          "relative time",
        );
      },
    },
  );
  const iso = "2026-10-21T14:00:00.000Z";
  const markdown = render_server_template(
    "{{server.started_at}} / {{server.checked_at}}",
    { server: { started_at: iso, checked_at: iso } },
  );
  const html = renderToStaticMarkup(
    React.createElement(ReactMarkdown, {
      components: { a: Link },
      children: markdown,
    }),
  );
  assert.equal((html.match(/relative time/g) || []).length, 2);
  assert.ok(html.includes(`title="${new Date(iso).toLocaleString()}"`));
  assert.ok(html.includes(`dateTime="${iso}"`));
  assert.ok(!html.includes('href="#server-time/'));
  const public_url = renderToStaticMarkup(
    React.createElement(Link, { href: "http://server/" }, "Server"),
  );
  assert.equal(public_url, '<a href="http://server/">Server</a>');
});

test("uptime scales from seconds through days with localized units", () => {
  for (const [value, expected] of [
    [0, "0 seconds"],
    [1, "1 second"],
    [59, "59 seconds"],
    [60, "1 minute"],
    [90, "1.5 minutes"],
    [3599, "59.9 minutes"],
    [3600, "1 hour"],
    [5400, "1.5 hours"],
    [86400, "1 day"],
    [216000, "2.5 days"],
  ])
    assert.equal(format_server_uptime(value, "en"), expected);
  for (const value of [undefined, null, false, -1, Infinity, "bad", ""])
    assert.equal(format_server_uptime(value, "en"), null);
});
