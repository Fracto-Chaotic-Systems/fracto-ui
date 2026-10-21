import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { render_server_template } from "../src/pages/admin/AdminServersTemplate.js";

const render = (url) =>
  renderToStaticMarkup(
    React.createElement(ReactMarkdown, {
      remarkPlugins: [remarkGfm],
      children: render_server_template("{{server.public_url}}", {
        server: { public_url: url },
      }),
    }),
  );

for (const url of [
  "http://10.0.0.182:3000/",
  "https://fracto.example/a_b/(main)/",
]) {
  test(`public server address renders with an intact label and destination: ${url}`, () => {
    assert.equal(render(url), `<p><a href="${url}">${url}</a></p>`);
  });
}

test("invalid public addresses remain literal text without an active link", () => {
  assert.equal(render("javascript:alert(1)"), "<p>javascript:alert(1)</p>");
  assert.equal(render("unavailable"), "<p>unavailable</p>");
});

test("runtime values cannot inject Markdown or HTML into the document", () => {
  const markdown = render_server_template("# {{server.name}}", {
    server: { name: "[fake](https://bad.example) <script>alert(1)</script>" },
  });
  const html = renderToStaticMarkup(
    React.createElement(ReactMarkdown, { children: markdown }),
  );
  assert.ok(!html.includes("<a "));
  assert.ok(!html.includes("<script>"));
});

test("the actual server template displays the LAN address without backslash corruption", () => {
  const template = readFileSync(
    new URL("../src/pages/admin/AdminServers.md", import.meta.url),
    "utf8",
  );
  const markdown = render_server_template(template, {
    server: { public_url: "http://10.0.0.182:3000/" },
  });
  const html = renderToStaticMarkup(
    React.createElement(ReactMarkdown, {
      remarkPlugins: [remarkGfm],
      children: markdown,
    }),
  );
  assert.ok(
    html.includes(
      '<a href="http://10.0.0.182:3000/">http://10.0.0.182:3000/</a>',
    ),
  );
  assert.ok(!html.includes("%5C"));
});
